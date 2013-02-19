function run_yelp (myradius, lat, lon, yTerms, ySort) {
	var auth = { 
		//
		// Update with your auth tokens.
		//
		consumerKey: "YlP_S16dRU2e5xuAN8p1oQ", 
		consumerSecret: "mfrv4kDk2wHwogmWheHMRhmj3VA",
		accessToken: "LmlKct7V5X_St4L5JfU-H7ZluK95Y_eg",
		// This example is a proof of concept, for how to use the Yelp v2 API with javascript.
		// You wouldn't actually want to expose your access token secret like this in a real application.
		accessTokenSecret: "pkNu_3r0cMfFVl0JFJD4sGVQl1E",
		serviceProvider: { 
			signatureMethod: "HMAC-SHA1"
		}
	};
	
	var terms = yTerms;
	var sort = ySort;	//0: best match 1: distance 2: rating * review count
	var radius_filter = myradius;
	var ll = lat +"," +lon;
	var accessor = {
		consumerSecret: auth.consumerSecret,
		tokenSecret: auth.accessTokenSecret
	};
	
	parameters = [];
	parameters.push(['term', terms]);
	parameters.push(['sort', sort]);
	parameters.push(['radius_filter', radius_filter]);
	parameters.push(['ll', ll]);
	parameters.push(['callback', 'cb']);
	parameters.push(['oauth_consumer_key', auth.consumerKey]);
	parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
	parameters.push(['oauth_token', auth.accessToken]);
	parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
	
	var message = { 
		'action': 'http://api.yelp.com/v2/search',
		'method': 'GET',
		'parameters': parameters 
	};
	
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
	
	var parameterMap = OAuth.getParameterMap(message.parameters);
	parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature)
	console.log(parameterMap);
	
	return $.ajax({
		'url': message.action,
		'data': parameterMap,
		'cache': true,
		'dataType': 'jsonp',
		'jsonpCallback': 'cb'
		
/*		,
		'success': function(data, textStats, XMLHttpRequest) {
			console.log(data);
			var output = prettyPrint(data);
//			$("body").append(output);

		}
*/		
	});
}