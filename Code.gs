function getTheTask_FolderAccess()
{ 
  var t = new Date();
  // Get settings from constant
  getSettings_();
  var ini = 
      {
        permissions_read: CCC_.FA_PERMISSIONS_READ,
        permissions_write: CCC_.FA_PERMISSIONS_WRITE,
        sheetName: CCC_.FA_WORKSHEET,
        rowNumData: CCC_.FA_ROWSTART,
        colNumCli: CCC_.FA_COL_CLI,
        colNumBoss: CCC_.FA_COL_BOSS,
        colNumRep: CCC_.FA_COL_REP,
        colNumFolder: CCC_.FA_COL_FOLDER,
        rootFolderId: CCC_.FA_FOLDER_ROOT,
        managertsData: CCC_.FA_MANAGERS,
        roles: CCC_.FA_ROLES,
        folders_taks: CCC_.STR_IDS_FOLDERMAKER,
        folders_paths: CCC_.STR_PATHS_FOLDERMAKER,
        delim1: CCC_.STR_DELIMEER1,                   // ;
        delim: CCC_.STR_DELIMEER2,                    // ~
        folder_delim: CCC_.STR_PATHDELIM_FOLDERMAKER, // \
        permissions_data: CCC_.FA_ACCESS,
        permissions_roles: CCC_.FA_ACCESS_ROLES,
        permissions_folders: CCC_.FA_ACCESS_FOLDERS,
        permissions_tasks: CCC_.FA_ACCESS_TASKS,
        tasks_parent: CCC_.FA_TASKS_PARENT,
        tasks_child: CCC_.FA_TASKS_CHILD,
        '': ''
      };
  var sets = {};

//  CCC_
//  Work Sheet	FA_WORKSHEET
//  First Row	FA_ROWSTART
//  Folder Col	FA_COL_FOLDER
//  Boss Col	FA_COL_BOSS
//  Rep Col	    FA_COL_REP
  
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //  1 этап. Получение исходных данных
  //
  //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  var client = {};
  
  var s = SpreadsheetApp.getActiveSheet();
  var r = SpreadsheetApp.getActiveRange();
  var row = r.getRow();
  client.folderRow = row;
  client.folderCol = ini.colNumFolder;
  client.sheetName = ini.sheetName;
  if (s.getName() !== ini.sheetName) { 
    Browser.msgBox('Выделите лист: ' + ini.sheetName)
    return -1;   
  } // wrong sheet  
  if (row < ini.rowNumData) { 
    Browser.msgBox('Выделите строку с данными')
    return -2; 
  } // wrong range
  
  var dataRow = s.getRange(row + ":" + row).getValues()[0];
  
  // get options of the order
  // client name
  client.name = dataRow[ini.colNumCli - 1];  
  if (client.name == '')
  {
    Browser.msgBox('Клиент не указан.')
    return -4;
  }
  // boss
  var boss = {};
  boss.name = dataRow[ini.colNumBoss - 1];
  if (boss.name == '')
  {
    Browser.msgBox('Руководитель не указан.')
    return -5; 
  }
  sets.boss = boss;
  // reporter
  var reporter = {};
  reporter.name = dataRow[ini.colNumRep - 1];
  if (reporter.name == '')
  {
    Browser.msgBox('Ответственный не указан.')
    return -6; 
  }  
  sets.reporter = reporter;
  // folder
  client.folderUrl = dataRow[ini.colNumFolder - 1];
  try
  {
    if (client.folderUrl == '') { client.folder = null; }
    else
    {
      client.folder = DriveApp.getFolderById(getIdFromFolderUrl_(client.folderUrl));
    }
  }
  catch(err)
  {
    Browser.msgBox('Не могу найти папку: ' + client.folderUrl + '\\n\\nПолный текст ошибки:\\n' + err);
    return -7;        
  }
  // root_folder
  try
  {
    sets.root_folder = DriveApp.getFolderById(ini.rootFolderId); 
  }
  catch(err)
  {
    Browser.msgBox('Не могу найти папку Клиентов: ' + ini.rootFolderId + '\\n\\nПолный текст ошибки:\\n' + err);
    return -8;     
  }
  

  


  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //  2 этап. Получение исходных данных о пользователях и ролях, конвертация из в необходимые для задачи данные
  //
  //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////  
  // get UserData
  var managers = JSON.parse(ini.managertsData);
  // managers:
  // {
  //    name
  //      folder
  //      email
  //      role
  // }
  var manager = managers[sets.reporter.name];
  if (!manager)
  {
    Browser.msgBox('Не могу в настройках найти сотрудника:\\n' + sets.reporter.name);
    return -9;
  }
  sets.reporter.email = manager.email;
  if (!manager.email)
  {
    Browser.msgBox('Не могу в настройках найти электронную почту сотрудника:\\n' + sets.reporter.name);
    return -10.1;        
  }
  sets.reporter.folder = manager.folder;
  if (!manager.folder)
  {
    Browser.msgBox('Не могу в настройках найти ссылку на папку сотрудника:\\n' + sets.reporter.name);
    return -10.2;              
  }
   sets.reporter.role = manager.role;
  if (!manager.role)
  {
    Browser.msgBox('Не могу в настройках найти роль сотрудника:\\n' + sets.reporter.name);
    return -10.2;              
  } 
  
  sets.client = client;
  
  //{
  //   "boss":{
  //      "name":"Белоусова Анна Дмитриевна"
  //   },
  //   "reporter":{
  //      "name":"Иванов Иван Иванович",
  //      "email":"test@mail.ru",
  //      "folder":"18lsoqfVwQWz6goYaIzz4ltZmKXunARyQ"
  //   },
  //   "root_folder":{
  //
  //   },
  //   "client":{
  //      "folderRow":9,
  //      "folderCol":4,
  //      "sheetName":"Клиенты",
  //      "name":"аа",
  //      "folderUrl":"",
  //      "folder":null
  //   }
  //}  
  
  // roles
  var roles = JSON.parse(ini.roles);
  var access = {};
  // add reporter to roles > only the 1 reporter, currently selected
  var reporter_role = {};
  reporter_role[sets.reporter.name] = {email: sets.reporter.email}; 
  roles[sets.reporter.role] = reporter_role;
  access.roles = roles;
  
  // folders
  var folders = {};
  var all_tasks = ini.folders_taks.split(ini.delim);
  var all_folder_paths = ini.folders_paths.split(ini.delim);
  var node = {};
  for (var i = 0; i < all_tasks.length; i++)
  {
    if (folders[all_tasks[i]])
    {
      node = folders[all_tasks[i]];     
    }
    else 
    {
      node = {}; 
    }    
    node[all_folder_paths[i]] = all_folder_paths[i].split(ini.folder_delim); 
    folders[all_tasks[i]] = node;
  }
  access.folders = folders;
  //{
  //   "boss":{
  //      "name":"Белоусова Анна Дмитриевна"
  //   },
  //   "reporter":{
  //      "name":"Иванов Иван Иванович",
  //      "email":"test@mail.ru",
  //      "folder":"18lsoqfVwQWz6goYaIzz4ltZmKXunARyQ"
  //   },
  //   "root_folder":{
  //
  //   },
  //   "client":{
  //      "folderRow":9,
  //      "folderCol":4,
  //      "sheetName":"Клиенты",
  //      "name":"аа",
  //      "folderUrl":"",
  //      "folder":null
  //   },
  //   "access":{
  //      "roles":{
  //         "Руководитель":{
  //            "Белоусова Анна Дмитриевна":{
  //               "email":"test@mail.ru"
  //            },
  //            "Микайлова Ширин":{
  //               "email":"test@mail.ru"
  //            },
  //            "Вася":{
  //               "email":"test@mail.ru"
  //            }
  //         },
  //         "Медиапланнер":{
  //            "Бузенкова Марина Михайловна":{
  //               "email":"test@mail.ru"
  //            },
  //            "Аня":{
  //               "email":"test@mail.ru"
  //            }
  //         },
  //         "Бухгалтер":{
  //            "Крапивницкий Дмитрий Викторович":{
  //               "email":"test@mail.ru"
  //            },
  //            "Петя":{
  //               "email":"test@mail.ru"
  //            }
  //         }
  //      },
  //      "folders":{
  //         "Клиент":{
  //            "Договор и безопасность":[
  //               "Договор и безопасность"
  //            ],
  //            "Баннеры":[
  //               "Баннеры"
  //            ],
  //            "Документы":[
  //               "Документы"
  //            ],
  //            "Отчеты":[
  //               "Отчеты"
  //            ],
  //            "Медиапланы":[
  //               "Медиапланы"
  //            ]
  //         },
  //         "Периоды":{
  //            "2020\\01 Январь":[
  //               "2020",
  //               "01 Январь"
  //            ],
  //            "2020\\02 Февраль":[
  //               "2020",
  //               "02 Февраль"
  //            ],
  //            "2020\\03 Март":[
  //               "2020",
  //               "03 Март"
  //            ],
  //            "2020\\04 Апрель":[
  //               "2020",
  //               "04 Апрель"
  //            ],
  //            "2020\\05 Май":[
  //               "2020",
  //               "05 Май"
  //            ],
  //            "2020\\06 Июнь":[
  //               "2020",
  //               "06 Июнь"
  //            ],
  //            "2020\\07 Июль":[
  //               "2020",
  //               "07 Июль"
  //            ],
  //            "2020\\08 Август":[
  //               "2020",
  //               "08 Август"
  //            ],
  //            "2020\\09 Сентябрь":[
  //               "2020",
  //               "09 Сентябрь"
  //            ],
  //            "2020\\10 Октябрь":[
  //               "2020",
  //               "10 Октябрь"
  //            ],
  //            "2020\\11 Ноябрь":[
  //               "2020",
  //               "11 Ноябрь"
  //            ],
  //            "2020\\12 Декабрь":[
  //               "2020",
  //               "12 Декабрь"
  //            ]
  //         }
  //      }
  //   }
  //}
  var permissions = {};
  permissions.types = {
    'read': ini.permissions_read, 
    'write': ini.permissions_write
  };
  var permissions_datarows = ini.permissions_data.split(ini.delim);
  var permissions_data = [];
  var permissions_datarow = [];
  // get array of permissions data
  for (var i = 0; i < permissions_datarows.length; i++)
  {
    permissions_datarow = permissions_datarows[i].split(ini.delim1);
    permissions_data.push(permissions_datarow);    
  }
  var permissions_roles = ini.permissions_roles.split(ini.delim);
  // folders + tasks = > pair
  var permissions_folders = ini.permissions_folders.split(ini.delim);
  var permissions_tasks = ini.permissions_tasks.split(ini.delim);  
  // create permissions object
  var permissions_sets = {};
  var permission = {}, permission_folder = {};
  for (var i = 0; i < permissions_tasks.length; i++)
  {
    if (permissions_sets[permissions_tasks[i]])                      // Клиенту
    {
      permission = permissions_sets[permissions_tasks[i]];
    }
    else
    {
      permission = {};      
    }
    if (permission[permissions_folders[i]])
    {
      permission_folder = permission[permissions_folders[i]];
    }
    else
    {
      permission_folder = {};
    }
    for (var ii = 0; ii < permissions_roles.length; ii++)
    {
      permission_folder[permissions_roles[ii]] = permissions_data[i][ii];
    }   
    permission[permissions_folders[i]] = permission_folder;
    permissions_sets[permissions_tasks[i]] = permission;
  }
  permissions.sets = permissions_sets;
  access.permissions = permissions;
  //{
  //   "boss":{
  //      "name":"Белоусова Анна Дмитриевна"
  //   },
  //   "reporter":{
  //      "name":"Иванов Иван Иванович",
  //      "email":"test@mail.ru",
  //      "folder":"18lsoqfVwQWz6goYaIzz4ltZmKXunARyQ"
  //   },
  //   "root_folder":{
  //
  //   },
  //   "client":{
  //      "folderRow":9,
  //      "folderCol":4,
  //      "sheetName":"Клиенты",
  //      "name":"аа",
  //      "folderUrl":"",
  //      "folder":null
  //   },
  //   "access":{
  //      "roles":{
  //         "Руководитель":{
  //            "Белоусова Анна Дмитриевна":{
  //               "email":"test@mail.ru"
  //            },
  //            "Микайлова Ширин":{
  //               "email":"test@mail.ru"
  //            },
  //            "Вася":{
  //               "email":"test@mail.ru"
  //            }
  //         },
  //         "Медиапланнер":{
  //            "Бузенкова Марина Михайловна":{
  //               "email":"test@mail.ru"
  //            },
  //            "Аня":{
  //               "email":"test@mail.ru"
  //            }
  //         },
  //         "Бухгалтер":{
  //            "Крапивницкий Дмитрий Викторович":{
  //               "email":"test@mail.ru"
  //            },
  //            "Петя":{
  //               "email":"test@mail.ru"
  //            }
  //         }
  //      },
  //      "folders":{
  //         "Клиент":{
  //            "[Имя клиента]":[
  //               "[Имя клиента]"
  //            ]
  //         },
  //         "Клиенту":{
  //            "Договор и безопасность":[
  //               "Договор и безопасность"
  //            ],
  //            "Баннеры":[
  //               "Баннеры"
  //            ],
  //            "Документы":[
  //               "Документы"
  //            ],
  //            "Отчеты":[
  //               "Отчеты"
  //            ],
  //            "Медиапланы":[
  //               "Медиапланы"
  //            ]
  //         },
  //         "Периоды":{
  //            "2020\\01 Январь":[
  //               "2020",
  //               "01 Январь"
  //            ],
  //            "2020\\02 Февраль":[
  //               "2020",
  //               "02 Февраль"
  //            ],
  //            "2020\\03 Март":[
  //               "2020",
  //               "03 Март"
  //            ],
  //            "2020\\04 Апрель":[
  //               "2020",
  //               "04 Апрель"
  //            ],
  //            "2020\\05 Май":[
  //               "2020",
  //               "05 Май"
  //            ],
  //            "2020\\06 Июнь":[
  //               "2020",
  //               "06 Июнь"
  //            ],
  //            "2020\\07 Июль":[
  //               "2020",
  //               "07 Июль"
  //            ],
  //            "2020\\08 Август":[
  //               "2020",
  //               "08 Август"
  //            ],
  //            "2020\\09 Сентябрь":[
  //               "2020",
  //               "09 Сентябрь"
  //            ],
  //            "2020\\10 Октябрь":[
  //               "2020",
  //               "10 Октябрь"
  //            ],
  //            "2020\\11 Ноябрь":[
  //               "2020",
  //               "11 Ноябрь"
  //            ],
  //            "2020\\12 Декабрь":[
  //               "2020",
  //               "12 Декабрь"
  //            ]
  //         }
  //      },
  //      "permissions":{
  //         "types":{
  //            "read":"read",
  //            "write":"write"
  //         },
  //         "sets":{
  //            "Клиенту":{
  //               "Договор и безопасность":{
  //                  "Руководитель":"write",
  //                  "Медиапланнер":"write",
  //                  "Бухгалтер":"write",
  //                  "Аккаунт":"write"
  //               },
  //               "Баннеры":{
  //                  "Руководитель":"read",
  //                  "Медиапланнер":"read",
  //                  "Бухгалтер":"read",
  //                  "Аккаунт":"read"
  //               },
  //               "Документы":{
  //                  "Руководитель":"read",
  //                  "Медиапланнер":"read",
  //                  "Бухгалтер":"write",
  //                  "Аккаунт":"read"
  //               },
  //               "Отчеты":{
  //                  "Руководитель":"read",
  //                  "Медиапланнер":"write",
  //                  "Бухгалтер":"read",
  //                  "Аккаунт":"write"
  //               }
  //            }
  //         }
  //      }
  //   }
  //}  
  var tasks = {};
  var tasks_parent = ini.tasks_parent.split(ini.delim);
  var tasks_child = ini.tasks_child.split(ini.delim);
  var task = {};
  for (var i = 0; i < tasks_parent.length; i++)
  {
    if (tasks[tasks_parent[i]])
    {
      task = tasks[tasks_parent[i]];     
    }
    else
    {
      task = {};
    }
    task[tasks_child[i]] = '';
    tasks[tasks_parent[i]] = task;
  }
  access.tasks = tasks;
  //{
  //   "boss":{
  //      "name":"Белоусова Анна Дмитриевна"
  //   },
  //   "reporter":{
  //      "name":"Иванов Иван Иванович",
  //      "email":"test@mail.ru",
  //      "folder":"18lsoqfVwQWz6goYaIzz4ltZmKXunARyQ"
  //   },
  //   "root_folder":{
  //
  //   },
  //   "client":{
  //      "folderRow":9,
  //      "folderCol":4,
  //      "sheetName":"Клиенты",
  //      "name":"аа",
  //      "folderUrl":"",
  //      "folder":null
  //   },
  //   "access":{
  //      "roles":{
  //         "Руководитель":{
  //            "Белоусова Анна Дмитриевна":{
  //               "email":"test@mail.ru"
  //            },
  //            "Микайлова Ширин":{
  //               "email":"test@mail.ru"
  //            },
  //            "Вася":{
  //               "email":"test@mail.ru"
  //            }
  //         },
  //         "Медиапланнер":{
  //            "Бузенкова Марина Михайловна":{
  //               "email":"test@mail.ru"
  //            },
  //            "Аня":{
  //               "email":"test@mail.ru"
  //            }
  //         },
  //         "Бухгалтер":{
  //            "Крапивницкий Дмитрий Викторович":{
  //               "email":"test@mail.ru"
  //            },
  //            "Петя":{
  //               "email":"test@mail.ru"
  //            }
  //         }
  //      },
  //      "folders":{
  //         "Клиент":{
  //            "[Имя клиента]":[
  //               "[Имя клиента]"
  //            ]
  //         },
  //         "Клиенту":{
  //            "Договор и безопасность":[
  //               "Договор и безопасность"
  //            ],
  //            "Баннеры":[
  //               "Баннеры"
  //            ],
  //            "Документы":[
  //               "Документы"
  //            ],
  //            "Отчеты":[
  //               "Отчеты"
  //            ],
  //            "Медиапланы":[
  //               "Медиапланы"
  //            ]
  //         },
  //         "Периоды":{
  //            "2020\\01 Январь":[
  //               "2020",
  //               "01 Январь"
  //            ],
  //            "2020\\02 Февраль":[
  //               "2020",
  //               "02 Февраль"
  //            ],
  //            "2020\\03 Март":[
  //               "2020",
  //               "03 Март"
  //            ],
  //            "2020\\04 Апрель":[
  //               "2020",
  //               "04 Апрель"
  //            ],
  //            "2020\\05 Май":[
  //               "2020",
  //               "05 Май"
  //            ],
  //            "2020\\06 Июнь":[
  //               "2020",
  //               "06 Июнь"
  //            ],
  //            "2020\\07 Июль":[
  //               "2020",
  //               "07 Июль"
  //            ],
  //            "2020\\08 Август":[
  //               "2020",
  //               "08 Август"
  //            ],
  //            "2020\\09 Сентябрь":[
  //               "2020",
  //               "09 Сентябрь"
  //            ],
  //            "2020\\10 Октябрь":[
  //               "2020",
  //               "10 Октябрь"
  //            ],
  //            "2020\\11 Ноябрь":[
  //               "2020",
  //               "11 Ноябрь"
  //            ],
  //            "2020\\12 Декабрь":[
  //               "2020",
  //               "12 Декабрь"
  //            ]
  //         }
  //      },
  //      "permissions":{
  //         "types":{
  //            "read":"read",
  //            "write":"write"
  //         },
  //         "sets":{
  //            "Клиенту":{
  //               "Договор и безопасность":{
  //                  "Руководитель":"write",
  //                  "Медиапланнер":"write",
  //                  "Бухгалтер":"write",
  //                  "Аккаунт":"write"
  //               },
  //               "Баннеры":{
  //                  "Руководитель":"read",
  //                  "Медиапланнер":"read",
  //                  "Бухгалтер":"read",
  //                  "Аккаунт":"read"
  //               },
  //               "Документы":{
  //                  "Руководитель":"read",
  //                  "Медиапланнер":"read",
  //                  "Бухгалтер":"write",
  //                  "Аккаунт":"read"
  //               },
  //               "Отчеты":{
  //                  "Руководитель":"read",
  //                  "Медиапланнер":"write",
  //                  "Бухгалтер":"read",
  //                  "Аккаунт":"write"
  //               }
  //            }
  //         }
  //      },
  //      "tasks":{
  //         "":{
  //            "Клиент":""
  //         },
  //         "Клиент":{
  //            "Клиенту":""
  //         },
  //         "Клиенту":{
  //            "Периоды":""
  //         }
  //      }
  //   }
  //}  
  sets.access = access;
  //  sets:
  //  {
  //    client
  //       name
  //       folderRow     // номер строки куда вернуть новый адрес папки
  //       folderCol     // номер колонки листа куда вернуть новый адрес папки
  //       sheetName     // имя листа куда вернуть новый адрес папки
  //       folderUrl     // ссылка на папку клиента  
  //       folder        // папка клиента. Если она не была создана ранее, то null
  //    boss             // руководитель
  //       name
  //       role  
  //       folder        
  //       email 
  //    reporter          // менеджер
  //       name
  //       folder        
  //       email  
  //    root_folder       // папка 
  //  }
  // Browser.msgBox(JSON.stringify(sets));
  runTheTask_FolderAccess_(sets)
  Browser.msgBox('Готово! Скрипт отработал за ' + getTimeEllapse_(t));
}






function runTheTask_FolderAccess_(sets)
{
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //  3. create root folders task "". if it was created: check parent: should be managers folder.
  //
  //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////     
  // get reporter folder
  try
  {
    var reporter_folder = DriveApp.getFolderById(sets.reporter.folder);
  }
  catch(err)
  {
    Browser.msgBox('Не могу открыть папку ответсвенного сотрудника или у вас нет к ней доступа. Папка с id: \\n' + sets.reporter.folder + '\\n\\nПолный текст ошибки:\\n' + err);
    return -13;            
  }   
  // get client folder
  var clientFolder = sets.client.folder; // get the folder if exists
  if (!clientFolder)
  {
    // create client folder if not exists

    // create and check the same name folder:
    clientFolder = createFolders_(reporter_folder, [sets.client.name]); 
  }
  else
  {
    // check that client folder is in reporter's folder
    var clientFolderParent = clientFolder.getParents().next(); // get first parent
    //    // get last parent
    //    while (clientFolderParents.hasNext())
    //    {
    //      clientFolderParent = clientFolderParents.next();
    //    }
    // check if folder id = reporter's folder id
    if (sets.reporter.folder !== clientFolderParent.getId())
    {
      reporter_folder.addFolder(clientFolder); // add the folder to another reporter
      clientFolderParent.removeFolder(clientFolder); // remove the folder from old reporter
    }
  }
  
  
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //  4. create all sub-folders if needed + access control
  //
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////// 
  var rootTask = sets.access.tasks[''];
  if (!rootTask)
  {
    Browser.msgBox('В настройках Задач укажите задачу с пустым Родителем.\\nТак скрипт поймет, какую папку создавать в папке ответсвенного сотрудника.');
    return -11;
  }
  var rootTaskKeys = Object.keys(rootTask);
  if (rootTaskKeys.length > 1)
  {
    Browser.msgBox('В настройках Задач укажите только задачу с пустым Родителем.\\nТак скрипт поймет, какую папку создавать в папке ответсвенного сотрудника.');
    return -12;        
  }
  var RootTaskKey = rootTaskKeys[0]; // Клиент  
  // loop tasks
  var nextTask = rootTask;  
  // nextTask      = { "Клиент":"" }
  // parentFolders = [] the list of parent folders to create child folders in
  var doTasks_ = function(nextTask, parentFolders) // loop all task till the end
  {
    if (!nextTask) 
    {
      // exit function
      return 0;    
    }
    var newFolders = [];
    for (var taskKey in nextTask) // { "Клиент":"" }
    {
      //    sets.access.folders: 
      //         {
      //              "Клиенту":{
      //            "Договор и безопасность":[
      //               "Договор и безопасность"
      //            ],
      //            ...
      //            "Медиапланы":[
      //               "Медиапланы"
      //            ]
      //         },
      var foldersInfo = sets.access.folders[taskKey]; // taskKey = Клиент
      // do the job
      if (RootTaskKey != taskKey) // RootTaskKey = Клиент
      {
        SpreadsheetApp.getActive().toast('папки по заданию ' + taskKey, 'Делаем...', 10);
        // for each parent folder
        // parentFolders = [folder, folder, folder]
        for (var i = 0; i < parentFolders.length; i++)
        {
          // loop folders to create
          for (var folderKey in foldersInfo)
          {
            // folderKey              =    Договор и безопасность
            // foldersInfo[folderKey  =    ["Договор и безопасность"]
            var newFolder = createFolders_(parentFolders[i], foldersInfo[folderKey]);
            // newFolder              =    {folder object}
            newFolders.push(newFolder); // add folders to the task
            // decide with access
            if (sets.access.permissions.sets[taskKey])
            {
              var access = sets.access.permissions.sets[taskKey][folderKey];
              if (access)
              {
                setFolderAccess(newFolder, {access: access, roles: sets.access.roles, types: sets.access.permissions.types});
              }            
            } // access branch ↑
          }
        }
      }
      else
      {
        // root task. Return with the same folders
        newFolders = parentFolders;
      }
      // Loop for next task
      doTasks_(sets.access.tasks[taskKey], newFolders);
    }
  }
  doTasks_(nextTask, [clientFolder]);

  
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //  write client folder URL to the sheet
  //
  //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////   
  if (sets.client.folderUrl === '') 
  {
    SpreadsheetApp.getActive().getSheetByName(sets.client.sheetName).getRange(sets.client.folderRow, sets.client.folderCol).setValue(clientFolder.getUrl());
  }
  
  return 0;
}


