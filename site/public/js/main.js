var map;
var yMarkers = [],
  yContent = [],
  ebMarkers = [],
	ebContent = [];
var targetMarker;
var myhome = new google.maps.LatLng(37.787123, -122.401131);

var mapDiv, mapOptions, myCircle;

//API params
var radiusMeters  = 1609.34;	//1mi = 1609.34m
var ebDateParam 	= "This Month";
var meterMile 		= 1609.34;
var yTerms 				= 'food';
var ySort 				= '0';	//0: best match 1: distance 2: rating * review count

//marker properties
var circleColor = "99999";
var targetColor = "0066FF";
var ebColor 		= "FF6600";
var yColor 			= "CC0000";
var ebClkColor 	= "FFFF33";
var precogColor = "99CCFF";

var yelpImage = 'images/marker_star.png';
var spinner = '<img id="waiting" src="images/spinner.gif" />';

var targetMarkerImage = new google.maps.MarkerImage(
	"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + targetColor,
	new google.maps.Size(21, 34),
	new google.maps.Point(0, 0),
	new google.maps.Point(10, 34));
var ebMarkerImage = new google.maps.MarkerImage(
	"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + ebColor,
	new google.maps.Size(21, 34),
	new google.maps.Point(0, 0),
	new google.maps.Point(10, 34));
var ebClkMarkerImage = new google.maps.MarkerImage(
	"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + ebClkColor,
	new google.maps.Size(21, 34),
	new google.maps.Point(0, 0),
	new google.maps.Point(10, 34));
var yOutMarkerImage = new google.maps.MarkerImage(
	"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + yColor,
  new google.maps.Size(21, 34),
  new google.maps.Point(0, 0),
  new google.maps.Point(10, 34));

var infowindow = new google.maps.InfoWindow({
  size: new google.maps.Size(80,50),
  maxWidth: 300,
});

function initialize() {
  mapDiv = document.getElementById('map_canvas');
  mapOptions = {
    center: myhome,
    zoom: 15,
    disableDefaultUI: true,
    panControl: true,
    zoomControl: true,
    zoomControlOptions: {
      style: google.maps.ZoomControlStyle.SMALL
    },
    scaleControl: true,
    streetViewControl: true,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  map = new google.maps.Map(mapDiv, mapOptions);

  var radiusWidget = new RadiusWidget();
  $("#events").css("visibility","hidden"); 
  $("#eventinfo").css("visibility","hidden"); 
  $("#restaurants").css("visibility","hidden"); 
  $("#analytics").css("visibility","hidden");
  $("#marker_status").text("Current location: " 
    +targetMarker.getPosition().toUrlValue(3)
    +" Radius: "
    +parseFloat(myCircle.getRadius() / meterMile).toFixed(3) + " mi");
}

function RadiusWidget() {
  this.set('map', map);
  this.set('position', map.getCenter());

  targetMarker = new google.maps.Marker({
    draggable: true,
    title: 'Move me!',
    icon: targetMarkerImage
  });

  myCircle = new google.maps.Circle({
    center: myhome,
    draggable: false,
    radius: radiusMeters,
    editable: true,
    strokeColor: circleColor,
    strokeOpacity: 0.15,
    strokeWeight: 1,
    fillColor: circleColor,
    fillOpacity: 0.15
  });

  // Bind the marker map property to the map property
  // Bind the marker position property to the position property
  targetMarker.bindTo('map', this);
  targetMarker.bindTo('position', this);
//  myCircle.setMap(map);
  myCircle.bindTo('map', this);
  myCircle.bindTo('position', targetMarker.getPosition());

  console.debug("Lat: " + targetMarker.getPosition().lat() 
  	+ " Long: " + targetMarker.getPosition().lng());

	//event handling when target marker is moved
  google.maps.event.addListener(targetMarker, 'dragend', function () {
    console.debug("Moved test point to: " + targetMarker.getPosition().toUrlValue(3));

    //re-center circle
    myCircle.setCenter(targetMarker.getPosition());
    $("#marker_status").text("Updated location to: " 
    	+ targetMarker.getPosition().toUrlValue(3));

    //update event and restaurant lists
    updateDashboard();

  });

	//event handling when radius of circle is modified
  google.maps.event.addListener(myCircle, 'radius_changed', function () {
    console.debug("adjusted radius: " 
    	+ parseFloat(myCircle.getRadius() / meterMile).toFixed(3) + " mi");
		//#FIXME update to hidden html
    $("#marker_status").css('text-align','center').text("Updated radius to: " 
    	+ parseFloat(myCircle.getRadius() / meterMile).toFixed(3) + " mi ("
    	+ parseFloat(myCircle.getRadius()).toFixed(3) +" m)");

    updateDashboard();
//    buildRestaurantList();
  });
}

RadiusWidget.prototype = new google.maps.MVCObject();

//
function updateDashboard() {
  console.debug("Updating dashboard events and restaurants");
  
	//clear map markers    
	clearEBMarkers();
	clearYMarkers();
	
  buildEventList();
  buildRestaurantList();
  $("#events").css("visibility","visible"); 
  $("#restaurants").css("visibility","visible"); 
}


function buildEventList() {
  console.debug("events to build");
  
  console.debug("radius: " + myCircle.getRadius() 
  	+ " lat: " +myCircle.getCenter().lat() 
  	+" lon: " +myCircle.getCenter().lng());
  
  //Eventbrite oath call	
  Eventbrite({
    'app_key': "57B773NQ4IVVTJCWMH",
    'user_key': "1224797457238894540"
  }, function (eb_client) {
		// parameters to pass to the API
		var params = {
			'within': Math.ceil(myCircle.getRadius()),
			'within_unit': 'K',
			'date': ebDateParam,
			'latitude': myCircle.getCenter().lat(),
			'longitude': myCircle.getCenter().lng()
    };
    
    // make a client request, provide another callback to handle the response data
    eb_client.event_search(params, function (data) {
      console.debug("listing eventbrite response:");
      console.debug(data);
  
      if (data.events.length == 0) {
        $("#events").text("No events found within this location and radius");
        return;
      }
      summary = data.events[0];
      console.debug("response summary: ")
      console.debug(summary);

      var content;

      $("#events").text("Events found:");
  
      for (var i = 1; i < data.events.length; i++) {
        myEvent = data.events[i].event;

        //populate page
        ev = {
          title: String(myEvent.title),
          organizer: String(myEvent.organizer.name),
          venueName: String(myEvent.venue.name),
          address: String(myEvent.venue.address),
          city: String(myEvent.venue.city),
          zip: String(myEvent.venue.postal_code),
          url: String(myEvent.url),
          description: String(myEvent.organizer.description),
          logo: String(myEvent.logo),
          capacity: String(myEvent.capacity),
          category: String(myEvent.category),
          repeat: myEvent.repeats,
          repeat_sched: String(myEvent.repeat_schedule),
          start: String(myEvent.start_date),   
          end: String(myEvent.end_date),
          tags: String(myEvent.tags),
          text_color: String(myEvent.text_color),
          lat: myEvent.venue.latitude,
          lon: myEvent.venue.longitude,
          id: i-1
        };

				console.debug("event: " +i);
        console.debug(ev);

        var marker = new google.maps.Marker({
          title: ev.title,
          map: window.map,
          position: new google.maps.LatLng(ev.lat, ev.lon),
          icon: ebMarkerImage
        });
        marker.setMap(window.map);

				//archive for reference
        ebMarkers.push(marker);
        ebContent.push(ev);

        content = '<p id="' + "eb" + (i-1) + '"><br><a href="' + ev.url + '">' 
        	+ ev.title + '</a>'; 
        if (ev.organizer !== "undefined") {
          content += '<br>organizer: ' + ev.organizer + '';
        }
        content += '<br><i>venue: ' + ev.venueName + '</i>';
        content += '<br>' + ev.address;
        content += '<br>' + ev.city + ' ' + ev.zip + '<br>'; 
        content += '<br style="margin-left: 3em;">category: ' + ev.category;
        content += '<br style="margin-left: 3em;">tags: ' + ev.tags;        
        content += '<hr/></p>';
        $("#content_done").empty();

        $(content).appendTo("#events");

				//normalize id pointer for archived eb markers and content lists
        attachInfoEB(marker, ev.id);
      }
    });
  });

}

function clearEB() {
  if (ebContent) {
    for (i in ebContent) {
      delete ebContent[i];
    }
  }
}

function clearEBMarkers() {
  if (ebMarkers) {
    $("#eventinfo").css("visibility","hidden");
    $("#analytics").css("visibility","hidden");
    for (i in ebMarkers) {
      ebMarkers[i].setMap(null);
      delete ebMarkers[i];
      delete ebContent[i];
    }
    ebMarkers.length = 0;
    ebContent.length = 0;
  }
}

//actions when event has been clicked
function attachInfoEB(marker, id) {

  eventId = 'eb' + id;
  var updateFlag = false;
  $('#'+eventId).click(function () {
    showEvent(marker, id);
    $.scrollTo('#map_canvas', {duration:2000});
  });
  google.maps.event.addListener(marker, 'click', function () {
    showEvent(marker, id);
  });  
}
function showEvent(marker, id) {
    $("#eventinfo").empty();
    $("#eventinfo").css("visibility","visible").hide().fadeIn("slow") ;
    $("#eventinfo").text("Selected event:");
    $("#marker_status").css("align","center").text("Event radius: " 
      +parseFloat(myCircle.getRadius() / meterMile).toFixed(3)
      +" mi");
    
    console.debug("clicked on event: " +id);
    console.debug(ebContent);
    
    ev = ebContent[id];
    console.debug(ev);
    
    //highlight marker on map
    marker.setIcon(ebClkMarkerImage);

    content = '<p id="' +eventId +'"><a href=\"' + ev.url + '\">' + ev.title + '</a>';
    if (ev.logo !== "undefined") {
      content += '<br><img src="' +ev.logo +'"/>';
    }
    content += '<br><color="' + ev.text_color + '"><i>' + ev.description + '</i>';
    content += '<br>organizer: ' + ev.organizer + '';
    content += '<br>venue: <b>' + ev.venueName +'</b>';
    content += '<br>' + ev.address;
    content += '<br>' + ev.city + ' ' + ev.zip + '<br>';
    content += '<br>event info:';
    content += '<br style="margin-left: 3em;">capacity: ' + ev.capacity;
    if (ev.repeat === "yes") {
      content += '<br>repeat schedule: ' + ev.repeat_schedule;
    }
    content += '<br>start: ' + ev.start;
    content += '<br>end: ' + ev.end;
    if (ev.category !== "") {
      content += '<br style="margin-left: 3em;">category: ' + ev.category;
    }
    if (ev.tags !== "undefined") {
      content += '<br style="margin-left: 3em;">tags: <i>' + ev.tags;
    }
    content += '</i></p>';
    console.debug(content);
    $("#eventinfo").append(content);

    console.debug("end on event");
}

//make Yelp API call and pull list of nearby restaurants
function buildRestaurantList() {
  //  alert("restaurants to build");
  console.debug("restaurants to build");
  $("#restaurants").text("updating restaurants");

  var promise_yelp = run_yelp(myCircle.getRadius() * 2, 
  	myCircle.getCenter().lat(), 
  	myCircle.getCenter().lng(),
  	yTerms,
  	ySort);

  promise_yelp.success(function (data) {
    populateYMap(data, myCircle.getRadius());
  });
  
  var promise_precog = precogQuery();
  $("#analytics").promise().done(function() {
  });
}

//
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition);
  } else {
    $("#marker_status").text("Geolocation is not supported by this browser.");
  }
}

//
function showPosition(position) {
  $("#marker_status").text("Latitude: " + position.coords.latitude +
    "<br>Longitude: " + position.coords.longitude);
}

google.maps.event.addDomListener(window, 'load', initialize);

function populateYMap(data, radius) {
  console.debug(data);
  $("#restaurants").empty();

  var content;
  for (var i = 0; i < data.businesses.length; i++) {
    biz = data.businesses[i];

    //populate map
    var marker = new google.maps.Marker({
      title: biz.name,
      map: window.map,
      position: new google.maps.LatLng(
      	biz.location.coordinate.latitude, 
      	biz.location.coordinate.longitude),
      icon: (biz.distance <= radius) ? yelpImage : yOutMarkerImage
    });
    marker.setMap(window.map);

    //populate page
    content = '<p id="' +'y'+i +'"><a href="' +biz.url +'">' +biz.name +'</a>';
    content += '<br><img src="' +biz.image_url +'"/>';
    content += '<br>phone: ' +biz.display_phone;
    content += '<br>review count: ' +biz.review_count  
      +' rating: ' +biz.rating;
    content += '<br><img src="' +biz.rating_img_url +'"/>';
    content += '<br>' +biz.location.display_address;
    content += '<br>categories: <i>' +biz.categories[0][0] +'<\i>';
    content += '</p>';
//    console.debug(content);
    $(content +'<hr/>').appendTo("#restaurants");

    yMarkers.push(marker);
    yContent.push(content);

    attachInfoYelp(marker, i);
  }
}

//display info window upon yelp map icon click
function attachInfoYelp(marker, id) {
  console.debug(yMarkers);
  console.debug("checking ymarker: " +id);

  google.maps.event.addListener(marker, 'click', function () {
    infowindow.close();
    infowindow.setContent(yContent[id]);
    infowindow.open(map, marker);
  });
  $('#y' +id).click(function() {
    infowindow.close();
    infowindow.setContent(yContent[id]);
    infowindow.open(map, marker);
    $.scrollTo('#map_canvas', {duration:2000});
  });
}

function clearYMarkers() {
  $('#analytics').css("visibility","visible")
    .fadeIn().text('updating summary analysis ')
    .css({backgroundColor: 'white'})
    .append(spinner);
  if (yMarkers) {
    for (i in yMarkers) {
      console.debug(yMarkers,yContent);
      yMarkers[i].setMap(null);
      delete yMarkers[i];
      delete yContent[i];
    }
    yMarkers.length = 0;
    yContent.length = 0;
    console.warn(yMarkers);
  }
}

function precogQuery() {
  $('#analytics').css("visibility","visible")
    .fadeIn().text('updating summary analysis ')
    .css({backgroundColor: 'white'})
    .append(spinner);

// Quirrel query in JavaScript generated with Labcoat by Precog
  var myquery = "all := //first_upload/foodvent radius := " 
    //myradius in meters
    +myCircle.getRadius() 
    //radius of earth in m
    +" R := 6371000 "
    +"lat_me := " ; 
    myquery += (myCircle.getCenter().lat() < 0) ? ("neg " +myCircle.getCenter().lat()*-1) : myCircle.getCenter().lat() ;
    myquery += " lon_me := ";
    myquery += (myCircle.getCenter().lng() < 0) ? ("neg " +myCircle.getCenter().lng()*-1) : myCircle.getCenter().lng() ;
    myquery += " dlat := std::math::toRadians(all.latitude) - std::math::toRadians(lat_me) dlon := std::math::toRadians(all.longitude) - std::math::toRadians(lon_me) lat1 := std::math::toRadians(all.latitude) lat2 := std::math::toRadians(all.longitude) a := std::math::sin(dlat/2) * std::math::sin(dlat/2) + std::math::sin(dlon/2) * std::math::sin(dlon/2) * std::math::cos(lat1) * std::math::cos(lat2) c := 2 * std::math::atan2(std::math::sqrt(a), std::math::sqrt(1-a)) d := (R * c) d' := d where d <= radius count(d')";
    
  console.debug(myquery);

  Precog.query(myquery,
    function(data) { 
      if (data.length == 1) {
        if ($("#waiting").length != 0) {
          $('#waiting').remove();
        }
        $("#analytics").css({backgroundColor: "#"+precogColor})
          .css("visibility","visible")
          .fadeIn().text("Total restaurants within radius: " +String(data));
      }
    },
    function(error) { console.log(error); }
  );
}
