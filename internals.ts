// this file is used to export all of the project files , creating a single point , from which
// all classes can import safely , this solves the circular dependence problem
// more info : https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de

// Open Project - Base Page objects
export * from './src/po/openproject/basePage';
export * from './src/po/openproject/baseComponent';

// Open Project - General
export * from './src/po/openproject/general/loginPage';
export * from './src/po/openproject/general/homePage';
export * from './src/po/openproject/general/projectSelectionComp';
export * from './src/po/openproject/general/mainMenuComp';
export * from './src/po/openproject/general/overviewPage';

// Open Project - Boards
export * from './src/po/openproject/board/boardsPage';
export * from './src/po/openproject/board/boardTypePage';
export * from './src/po/openproject/board/newBoardPage';

// Open Project - Time and Costs
export * from './src/po/openproject/timeandcosts/logTimeDialogComp';
export * from './src/po/openproject/timeandcosts/costReportsPage';

// Open Project - Meetings
export * from './src/po/openproject/meeting/meetingsPage';
export * from './src/po/openproject/meeting/meetingShowPage';
export * from './src/po/openproject/meeting/meetingFormDialogComp';
export * from './src/po/openproject/meeting/agendaItemsComp';
export * from './src/po/openproject/meeting/meetingSidePanelComp';

// Open Project - Members
export * from './src/po/openproject/members/membersPage';
export * from './src/po/openproject/members/memberTableComp';
export * from './src/po/openproject/members/memberTableRowComp';

// Open Project - Work Packages
export * from './src/po/openproject/workpackage/workPackagesPage';
export * from './src/po/openproject/workpackage/workPackageTypeMenuComp';
export * from './src/po/openproject/workpackage/newWorkPackagePage';
export * from './src/po/openproject/workpackage/workPackageDetailsPage';
export * from './src/po/openproject/workpackage/deleteWorkPackageDialogComp';

// Saucelabs (demo) - All Page objects
export * from './src/po/saucelabs/loginPage';
export * from './src/po/saucelabs/productsPage';
export * from './src/po/saucelabs/cartPage';
export * from './src/po/saucelabs/checkoutCustomerInfoPage';
export * from './src/po/saucelabs/checkoutOverviewPage';
export * from './src/po/saucelabs/sidebarMenu';
