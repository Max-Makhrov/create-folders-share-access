function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('📁 Администратор')
      .addItem('Создать папки и доступ. ⏳ ~ 2 мин.', 'getTheTask_FolderAccess')
  //      .addSeparator()
  //      .addSubMenu(ui.createMenu('Sub-menu')
  //          .addItem('Second item', 'menuItem2'))
      .addToUi();
}



