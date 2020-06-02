// code for creating folders
// folder = folder object
// names = [] array
function createFolders_(folder, names)
{
  if (('' + folder) === 'null') { folder = DriveApp.getRootFolder(); }
  var name = '';
  for (var i = 0; i < names.length; i++)
  {
    name = names[i];
    folder = createFolderInFolder_(folder, name); 
  }
  return folder;  
}
function createFolderInFolder_(folder, name) {
  var existingFolder = isFolderInFolder_(folder, name);
  if (existingFolder) { return existingFolder; } // exclude creating folders with the same names 
  var result = folder.createFolder(name);
  return result;  
}
function isFolderInFolder_(folder, name) {
  var folders = folder.getFolders();
  var folder;
  while (folders.hasNext())
  {
    folder = folders.next();
    if (folder.getName() === name) { return folder; }
  }
  return false; 
}


// 'https://drive.google.com/drive/folders/FOLDER_ID' → FOLDER_ID
// '' → ''
function getIdFromFolderUrl_(folderUrl)
{
  if (!folderUrl || folderUrl == '') { return ''; }
  var matchs = folderUrl.match(/folders\/([^\/]*)/);
  if (!matchs) { return ''; }
  return matchs[1];
}


// folder         =    {folder object}
// permissions    =    
//            {
//              access: {
//                  "Руководитель":"write",
//                  "Медиапланнер":"read",
//                  "Бухгалтер":"read",
//                  "Аккаунт":"read"
//               }
//			    roles:{
//				 "Руководитель":{
//					"Белоусова Анна Дмитриевна":{
//					   "email":"test@mail.ru"
//					},
//					"Микайлова Ширин":{
//					   "email":"test@mail.ru"
//					},
//               ...
//				 "Бухгалтер":{
//					"Крапивницкий Дмитрий Викторович":{
//					   "email":"test@mail.ru"
//					},
//					"Петя":{
//					   "email":"test@mail.ru"
//					}
//				 }
//			     "types":{
//					"read":"read",
//					"write":"write"
//				 },
function setFolderAccess(folder, permissions)
{
  if (!folder) { return -1; } // no folder
  // folder = DriveApp.getFolderById('x');
  
  var read = permissions.types.read;
  var write = permissions.types.write;
  
  // get current editores and viewers
  var owner_is = folder.getOwner().getEmail();
  var editors_is_object = folder.getEditors(); // an array of email addresses
  var editors_is = [], editor;
  for (var i = 0; i < editors_is_object.length; i++)
  {
    editor = editors_is_object[i].getEmail()
    if (owner_is !== editor) { editors_is.push(editor); } // if not owner!
  }  
  var viewers_is_object = folder.getViewers(); // an array of email addresses
  var viewers_is = [];
  for (var i = 0; i < viewers_is_object.length; i++)
  {
    viewers_is.push(viewers_is_object[i].getEmail());
  }
  
  // get editors: write, and viewers: read
  var editors_must = [];  
  var viewers_must = [];
  for (var role in permissions.access)
  {
    if (permissions.access[role] === read)
    {
      for (var user in permissions.roles[role])
      {
        viewers_must.push(permissions.roles[role][user].email);    
      }      
    }
    if (permissions.access[role] === write)
    {
      for (var user in permissions.roles[role])
      {
        editors_must.push(permissions.roles[role][user].email);    
      }      
    }    
  }
  
  // Browser.msgBox(JSON.stringify({name: folder.getName(), editors_is: editors_is, viewers_is: viewers_is, editors_must: editors_must, viewers_must: viewers_must}))
  
  // kill extra access: write
  for (var i = 0; i < editors_is.length; i++)
  {
    if (editors_must.indexOf(editors_is[i]) === -1)
    {
      // renove editor
      folder.removeEditor(editors_is[i]);  
    } 
  }
  // kill extra access: read
  for (var i = 0; i < viewers_is.length; i++)
  {
    if (viewers_must.indexOf(viewers_is[i]) === -1)
    {
      // renove editor
      folder.removeViewer(viewers_is[i]);  
    } 
  } 
  // add new viewers
  for (var i = 0; i < viewers_must.length; i++)
  {
    if (viewers_is.indexOf(viewers_must[i]) === -1)
    {
      folder.addViewer(viewers_must[i]);      
    }    
  }
  // add new editors
  for (var i = 0; i < editors_must.length; i++)
  {
    if (editors_is.indexOf(editors_must[i]) === -1)
    {
      folder.addEditor(editors_must[i]);
    }    
  }  
  return 0;    
}