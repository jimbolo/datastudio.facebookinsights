var cc = DataStudioApp.createCommunityConnector();

function getConfig() {
  var config = cc.getConfig();

  config.newInfo()
      .setId('instructions')
  .setText('Please enter the configuration data for your Facebook connector');

  config.newTextInput()
      .setId('page_id')
      .setName('Enter your Facebook Page Id')
      .setHelpText('Find the page Id on the \'About\' section of your page')  
      .setPlaceholder('Enter Facebook Page Id here')
      .setAllowOverride(false);
  
  config.setDateRangeRequired(true);

  return config.build();
}

  /*
  ------------------------------------------------------
  DataStudio fields
  ------------------------------------------------------
  */

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType; 
  
  fields.newMetric()
      .setId('pageViewsTotal')
      .setName('Page Views')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('pageFans')
      .setName('Page Likes')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('pagePostsReach')
      .setName('Post Reach')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
    
  return fields;
}


function getSchema(request) {  
    var fields = getFields().build();
    return { 'schema': fields };    
}

function getData(request) {   
  
  var nestedData = graphData(request, "insights/?metric=['page_views_total', 'page_fans', 'page_posts_impressions_unique']&period=day");
  
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  
  
  var outputData = {};
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  // Perform data request per field
  request.fields.forEach(function(field) {
    var rows = [];
    
        if (field.name == 'pageViewsTotal') {
           outputData.page_views_total = nestedData['page_views_total'];
        }
        if (field.name == 'pageFans') {
           outputData.page_fans = nestedData['page_fans'];
        }
        if (field.name == 'pagePostsReach') {
           outputData.page_posts_reach = nestedData['page_posts_impressions_unique'];
        }
        
        if (typeof outputData !== 'undefined') {    
          rows = reportToRows(requestedFields, outputData);
          // TODO: parseData.paging.next != undefined
        } else {
          rows = [];
        }
         result = {
            schema: requestedFields.build(),
            rows: rows
          };  
    
  });
  
  return result;  
}

function reportPageFans(report) {
  var rows = [];
    
  // Only report last number of page likes within date range
  var row = {};
  var lastObject = report[report.length-1]
  row["pageFans"] = lastObject[lastObject.length-1]['value'];
  rows[0] = row;
  
  return rows;
  
}

// Report all daily reports to rows 
function reportDaily(report, type) {
  var rows = [];
  
  //Loop chunks
  for (var c = 0; c <  report.length; c++) {
  
    var valueRows = report[c];
    
    // Loop report
    for (var i = 0; i < valueRows.length; i++) {
      var row = {};
      
      row[type] = report[c][i]['value'];
      
      // Assign all data to rows list
      rows.push(row);
    }
  }

  return rows;
}

function reportToRows(requestedFields, report) {
  var rows = [];
  var data = [];  
  
  if (typeof report.page_views_total !== 'undefined') {
    data = data.concat(reportDaily(report.page_views_total, 'pageViewsTotal'));
  }
  if (typeof report.page_fans !== 'undefined') {
    data = data.concat(reportPageFans(report.page_fans));
  }   
  if (typeof report.page_posts_reach !== 'undefined') {
    data = data.concat(reportDaily(report.page_posts_reach, 'pagePostsReach'));
  }   
  
  // Merge data
  for(var i = 0; i < data.length; i++) {
    row = [];    
    requestedFields.asArray().forEach(function (field) {
  
         switch (field.getId()) {
           case 'pageViewsTotal':
              return row.push(data[i]["pageViewsTotal"]);
            case 'pageFans':
              return row.push(data[i]["pageFans"]);
            case 'pagePostsReach':
              return row.push(data[i]["pagePostsReach"]);
        }
      
    });
    if (row.length > 0) {
      rows.push({ values: row });
    }
  }
    
  return rows;
    
}


function isAdminUser(){
 var email = Session.getEffectiveUser().getEmail();
  if( email == 'steven@itsnotthatkind.org' || email == 'analyticsintk@gmail.com'){
    return true; 
  } else {
    return false;
  }
}

/**** BEGIN: OAuth Methods ****/

function getAuthType() {
  var response = { type: 'OAUTH2' };
  return response;
}

function resetAuth() {
  getOAuthService().reset();
}

function isAuthValid() {
  return getOAuthService().hasAccess();
}

function getOAuthService() {
  return OAuth2.createService('exampleService')
    .setAuthorizationBaseUrl('https://www.facebook.com/dialog/oauth')
    .setTokenUrl('https://graph.facebook.com/v5.0/oauth/access_token')      
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCallbackFunction('authCallback')
    .setScope('pages_show_list, manage_pages, read_insights');
};

function authCallback(request) {
  var authorized = getOAuthService().handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  };
};

function get3PAuthorizationUrls() {
  return getOAuthService().getAuthorizationUrl();
}

/**** END: OAuth Methods ****/

