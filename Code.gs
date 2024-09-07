function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Enactus Voting System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


function getNomineeVoters(nomineeName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var membersSheet = spreadsheet.getSheetByName('Members');
  var votesSheet = spreadsheet.getSheetByName('Votes');

  var members = membersSheet.getDataRange().getValues().slice(1);
  var votes = votesSheet.getDataRange().getValues().slice(1);

  var nomineeVotes = votes.filter(vote => vote[0] === nomineeName);
  var votedMemberIds = new Set(nomineeVotes.map(vote => vote[1]));

  var voters = [];
  var nonVoters = [];

  members.forEach(member => {
    if (votedMemberIds.has(member[1])) {
      voters.push(member[0]);
    } else {
      nonVoters.push(member[0]);
    }
  });

  return {
    voters: voters,
    nonVoters: nonVoters
  };
}

function checkLogin(nationalId, password) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Members');
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] == nationalId && data[i][3] == password) {
        return { success: true, name: data[i][0], nationalId: data[i][1] };
      }
    }
    return { success: false, message: 'Invalid credentials. Please try again.' };
  } catch (error) {
    console.error('Error in checkLogin:', error);
    return { success: false, message: 'An error occurred. Please try again later.' };
  }
}

function getNominees(nationalId) {
  try {
    var nomineesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Nominees');
    
    // Get values from columns A (Nominee names) and B (Committees)
    var data = nomineesSheet.getRange('A1:B100').getValues();

    // Filter out empty rows and prepare nominees with their committees
    var nomineesData = data.filter(row => row[0] && row[1]); // Ensures both nominee and committee are present

    // Votes data
    var votesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Votes');
    var votesData = votesSheet.getDataRange().getValues();

    // Get nominees that the user has already voted for
    var votedNominees = votesData.filter(row => row[1] === nationalId).map(row => row[0]);

    // Group nominees by their committee
    var groupedNominees = {};

    nomineesData.forEach(row => {
      var nominee = row[0];
      var committee = row[1];

      // Check if the nominee has already been voted for
      if (!votedNominees.includes(nominee)) {
        // Create group if it doesn't exist
        if (!groupedNominees[committee]) {
          groupedNominees[committee] = [];
        }
        // Add nominee to the correct group
        groupedNominees[committee].push(nominee);
      }
    });

    return groupedNominees; // Return grouped nominees as an object
  } catch (error) {
    console.error('Error in getNominees:', error);
    return {};
  }
}


function recordVote(nominee, vote, nationalId) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Votes');
    var existingVote = sheet.getDataRange().getValues().find(row => row[0] === nominee && row[1] === nationalId);
    
    if (existingVote) {
      return { success: false, message: 'You have already voted for this nominee.' };
    }
    
    sheet.appendRow([nominee, nationalId, vote, new Date()]);
    
    return { success: true };
  } catch (error) {
    console.error('Error in recordVote:', error);
    return { success: false, message: 'An error occurred while recording your vote. Please try again.' };
  }
}
function testSheetAccess() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = spreadsheet.getSheets();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      sheetNames: sheets.map(sheet => sheet.getName())
    }));
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}


// function getAdminData() {
//   var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
//   var membersSheet = spreadsheet.getSheetByName('Members');
//   var votesSheet = spreadsheet.getSheetByName('Votes');
//   var nomineesSheet = spreadsheet.getSheetByName('Nominees');

//   var members = membersSheet.getDataRange().getValues().slice(1);
//   var votes = votesSheet.getDataRange().getValues().slice(1);
//   var nominees = nomineesSheet.getRange('A1:A100').getValues().filter(String);

//   var votedMembers = new Set(votes.map(vote => vote[1]));
//   var nonVoters = members.filter(member => !votedMembers.has(member[1])).map(member => member[0]);

//   var nomineeStats = nominees.map(nominee => {
//     var nomineeVotes = votes.filter(vote => vote[0] === nominee);
//     var yesVotes = nomineeVotes.filter(vote => vote[2] === 'Yes').length;
//     var totalVotes = nomineeVotes.length;
//     var yesRate = totalVotes > 0 ? (yesVotes / totalVotes * 100).toFixed(2) + '%' : 'N/A';
//     return {
//       name: nominee,
//       yesRate: yesRate,
//       totalVotes: totalVotes
//     };
//   });

//   return {
//     nonVoters: nonVoters,
//     nomineeStats: nomineeStats,
//     nominees: nominees
//   };
// }
function getAdminData() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var membersSheet = spreadsheet.getSheetByName('Members');
  var votesSheet = spreadsheet.getSheetByName('Votes');
  var nomineesSheet = spreadsheet.getSheetByName('Nominees');

  // Retrieve data from the sheets
  var members = membersSheet.getDataRange().getValues().slice(1); // Skip header row
  Logger.log('Members Data: %s', members);

  var votes = votesSheet.getDataRange().getValues().slice(1); // Skip header row
  Logger.log('Votes Data: %s', votes);

  var nominees = nomineesSheet.getRange('A1:A100').getValues().filter(row => row[0]); // Get nominees from column A, removing empty rows
  Logger.log('Nominees Data: %s', nominees);

  // Create a set of voted members using their IDs from the votes sheet
  var votedMembers = new Set(votes.map(vote => vote[1])); // Assuming member IDs are in column B (index 1)
  Logger.log('Voted Members: %s', Array.from(votedMembers));

  // Filter members who haven't voted
  var nonVoters = members.filter(member => !votedMembers.has(member[1])).map(member => member[0]); // Member names are in column A
  Logger.log('Non-voters: %s', nonVoters);

  // Calculate stats for each nominee
  var nomineeStats = nominees.map(nomineeRow => {
    var nominee = String(nomineeRow[0]).trim(); // Convert to string and trim whitespace
    Logger.log('Processing Nominee: %s', nominee);

    // Filter votes corresponding to this nominee
    var nomineeVotes = votes.filter(vote => String(vote[0]).trim() === nominee); // Nominee names in column A (index 0)
    Logger.log('Votes for nominee %s: %s', nominee, nomineeVotes);

    // Count the number of 'Yes' votes
    var yesVotes = nomineeVotes.filter(vote => String(vote[2]).trim().toLowerCase() === 'yes').length; // Yes/No votes in column C (index 2)
    Logger.log('Yes Votes for %s: %d', nominee, yesVotes);

    // Total votes for this nominee
    var totalVotes = nomineeVotes.length;
    Logger.log('Total Votes for %s: %d', nominee, totalVotes);

    // Calculate Yes rate
    var yesRate = totalVotes > 0 ? (yesVotes / totalVotes * 100).toFixed(2) + '%' : 'N/A';
    Logger.log('Yes Rate for %s: %s', nominee, yesRate);

    return {
      name: nominee,
      yesRate: yesRate,
      totalVotes: totalVotes
    };
  });

  Logger.log('Nominee Stats: %s', nomineeStats);

  // Return the compiled admin data
  return {
    nonVoters: nonVoters,
    nomineeStats: nomineeStats,
    nominees: nominees.map(nomineeRow => String(nomineeRow[0]).trim())
  };
}



function getPresidentialCandidates() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Presidential Candidates');
  var candidates = sheet.getRange('A1:B2').getValues();
  return candidates;
}

function recordPresidentialVote(candidate, nationalId) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Presidential Votes');
    var existingVote = sheet.getDataRange().getValues().find(row => row[1] === nationalId);
    
    if (existingVote) {
      return { success: false, message: 'You have already voted for the presidential position.' };
    }
    
    sheet.appendRow([candidate, nationalId, new Date()]);
    
    return { success: true };
  } catch (error) {
    console.error('Error in recordPresidentialVote:', error);
    return { success: false, message: 'An error occurred while recording your vote. Please try again.' };
  }
}
