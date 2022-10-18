/* Stylesheet by Alicia Wood, 2022 */

// QUICK GUIDE TUTORIAL
var map = L.map('map').setView([45.5152, -122.6784], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Map data © OpenStreetMap'
}).addTo(map);

var marker = L.marker([45.5152, -122.6784]).addTo(map);

var circle = L.circle([45.5179, -122.6425], {
    color: 'green',
    fillColor: '#6B8E23',
    fillOpacity: 0.5,
    radius: 450
}).addTo(map);

var polygon = L.polygon([
    [45.512, -122.645],
    [45.512, -122.654],
    [45.505, -122.654],
    [45.505, -122.645]
    ], {
    color: 'orange',
    fillColor: '#FFA500',
    fillOpacity: 0.5
}).addTo(map);

marker.bindPopup("<b>Welcome to Portland!</b><br>I am a popup.").openPopup();
circle.bindPopup("I am a circle.");
polygon.bindPopup("I am a polygon.");

var popup = L.popup()
    .setLatLng([45.5211, -122.6272])
    .setContent("Welcome to Laurelhurst park (standalone popup)")
    .openOn(map);

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

map.on('click', onMapClick);

//GEOJSON TUTORIAL
var map2 = L.map('map2').setView([39.75621, -104.99404], 4);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Map data © OpenStreetMap'
}).addTo(map2);

// creates geojson feature
var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "amenity": "Baseball Stadium",
        "popupContent": "This is where the Rockies play!"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
};
// adds feature to map
//L.geoJSON(geojsonFeature).addTo(map2);

// GeoJSON objects may also be passed as an array of valid GeoJSON objects
// this method of styling styles all paths (polyline and polygon the same)
var myLines = [{
    "type": "LineString",
    "coordinates": [[-100, 40], [-105, 45], [-110, 55]]
}, {
    "type": "LineString",
    "coordinates": [[-105, 40], [-110, 45], [-115, 55]]
}];
var myStyle = {
    "color": "#ff7800",
    "weight": 5,
    "opacity": 0.65
};
L.geoJSON(myLines, {
    style: myStyle
}).addTo(map2);

// alternatively can create an empty geojsnon layer and assign it to a variable so can add features to it later
var myLayer = L.geoJSON().addTo(map2);
myLayer.addData(geojsonFeature);

// Alternatively to styling all paths the same, we can pass a function that styles individual features based on their properties.
var states = [{
    "type": "Feature",
    "properties": {"party": "Republican"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-104.05, 48.99],
            [-97.22,  48.98],
            [-96.58,  45.94],
            [-104.03, 45.94],
            [-104.05, 48.99]
        ]]
    }
}, {
    "type": "Feature",
    "properties": {"party": "Democrat"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-109.05, 41.00],
            [-102.06, 40.99],
            [-102.03, 36.99],
            [-109.04, 36.99],
            [-109.05, 41.00]
        ]]
    }
}];

L.geoJSON(states, {
    style: function(feature) {
        switch (feature.properties.party) {
            case 'Republican': return {color: "#ff0000"};
            case 'Democrat':   return {color: "#0000ff"};
        }
    }
}).addTo(map2);


/* 
Points are handled differently than polylines and polygons. By default simple markers are drawn for GeoJSON Points. 
We can alter this by passing a pointToLayer function in a GeoJSON options object when creating the GeoJSON layer. 
This function is passed a LatLng and should return an instance of ILayer, in this case likely a Marker or CircleMarker.
*/
/* Can't seem to get this example to work
var geojsonMarkerOptions = {
    radius: 8,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};
L.geoJSON(someGeojsonFeature, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptions);
    }
}).addTo(map2);
*/


/* The onEachFeature option is a function that gets called on each feature before adding it to a GeoJSON layer. A common reason to use this option is to attach a popup to features when they are clicked.
*/
function onEachFeature(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
}
var someGeojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Cheyenne",
        "popupContent": "This is Wyoming's capital!"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.80545, 41.161079]
    }
};
L.geoJSON(someGeojsonFeature, {
    onEachFeature: onEachFeature
}).addTo(map2);

/* The filter option can be used to control the visibility of GeoJSON features. To accomplish this we pass a function as the filter option. This function gets called for each feature in your GeoJSON layer, and gets passed the feature and the layer. You can then utilise the values in the feature's properties to control the visibility by returning true or false.
In the example below "Busch Field" will not be shown on the map.
*/
var someFeatures = [{
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "show_on_map": true
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
}, {
    "type": "Feature",
    "properties": {
        "name": "Busch Field",
        "show_on_map": false
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.98404, 39.74621]
    }
}];

L.geoJSON(someFeatures, {
    filter: function(feature, layer) {
        return feature.properties.show_on_map;
    }
}).addTo(map2);

