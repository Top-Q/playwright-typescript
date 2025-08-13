// this file is used to export all of the project files , creating a single point , from which
// all classes can import safely , this solves the circular dependence problem
// more info : https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de


//Page objects
export * from './src/po/openproject/basePage'
export * from './src/po/openproject/baseComponent'
export * from './src/po/openproject/introPage'
export * from './src/po/openproject/homePage'
export * from './src/po/openproject/projectSelectionComp'
export * from "./src/po/openproject/MainMenuComp"
export * from './src/po/openproject/overviewPage'
export * from './src/po/openproject/workPackagesPage'
export * from './src/po/openproject/boardsPage'
export * from './src/po/openproject/boardTypePage'
export * from './src/po/openproject/newBoardPage'
export * from './src/po/openproject/workPackagesPage' // Re-export TaskTypeMenu and WorkPackagesPage
export * from './src/po/openproject/newWorkpackagePage'
