/* Stylesheet by Alicia Wood, 2022 */

//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map', {
        center: [20, 0],
        zoom: 2
    });
    
    // LOADING A STYLE INSTEAD OF A TILESET WORKS BUT IS THERE A DRAWBACK???
    // if can find another greyscale tileset with less labels at that global scale then switch out
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
        tileSize: 512,
        maxZoom: 18,
        zoomOffset: -1,
        id: 'mapbox/light-v10',
        accessToken: 'pk.eyJ1IjoiYWp3b29kMyIsImEiOiJjbDhvYXIxcTcwbGVmM29wYnE3aG1vNHAxIn0.BV4soEvmlrLNgGZCYsQ0Sw'
    }).addTo(map);
    
    //call getData function
    getData(map); 
};

// function for calculating the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 3;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    // return calculated radius
    return radius;
};

// function for creating popup with attribute information based on the attribute in sequence
function createPopup(properties, attribute, layer, radius){
    // add country to popup content string
    var popupContent = "<p><b>Country:</b> " + properties.COUNTRY + "</p>";

    // add formatted attribute to panel content string
    var year = attribute.substr(3, 6);
    popupContent += "<p><b>Maternal Mortality Rate in " + year + ":</b> " + properties[attribute] + " deaths per 100,000 births</p>";

    // replace the layer popup
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius)
    });
};

// function to convert markers to circle markers, visualize with proportional attributes and create popups
function pointToLayer(feature, latlng, attributes){
    // identify which attribute to visualize with proportional symbols
    // var attribute = "MMR2000"; // if directly referencing specific attribute field
    var attribute = attributes[0]; //able to pull field from array to support sequencing
    //check
    //console.log(attribute);
    
    //create marker options
    var markerOptions = {
        fillColor: "#ff3535", //ff7800  //ff3535
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    
    // for each feature, determine its value for the selected attribute above
    var attValue = Number(feature.properties[attribute]);
    // examine the attribute value to check that it is correct
    //console.log(feature.properties, attValue);
    // give each feature's circle marker a radius based on its attribute value
    markerOptions.radius = calcPropRadius(attValue);
    // create circle markers layer with above options
    var circleLayer = L.circleMarker(latlng, markerOptions);

    // call the createPopup function to create a popup with the current sequence attribute
    createPopup(feature.properties, attribute, circleLayer, markerOptions.radius);

    // use event listeners to open popup on hover and optional step to  fill panel on click
    circleLayer.on({
        mouseover: function(){
            this.openPopup();
            this.setStyle({fillColor: '#5c0000'}); //#ffaaaa
        },
        mouseout: function(){
            this.closePopup();
            this.setStyle({fillColor: '#ff3535'});
        },
    });
    
    //return the circle marker to the L.geoJson pointToLayer option
    return circleLayer;
}

// function for preparing the various versions of the MMR data for use in the "filter" (user toggling on and off versions)
function prepareFilteredData (data, map, attributes, filter) {
    var geojsonLayer = L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        },
        filter: function(feature, layer) {
            if (filter == ">0"){
                return feature.properties.MMR_DIFF_2000_2016 > 0;
            } else if (filter == "<0") {
                return feature.properties.MMR_DIFF_2000_2016 < 0;
            } else if (filter == "=0") {
                return feature.properties.MMR_DIFF_2000_2016 == 0;
            } else {
                return feature.properties.MMR_DIFF_2000_2016 !== null;
            };
        }
    });
    return geojsonLayer;
}

// function for creating circle markers for point features based on an attribute (calls above functions)
function createPropSymbols(data, map, attributes){
    // create 3 versions of the leaflet geojson layer to add to map (and turn on/off later with button)
    var geojsonLayerAll = prepareFilteredData (data, map, attributes, "none");
    var geojsonLayerWorse = prepareFilteredData (data, map, attributes, ">0");
    var geojsonLayerBetter = prepareFilteredData (data, map, attributes, "<0");
    var geojsonLayerSame = prepareFilteredData (data, map, attributes, "=0");
    
    // online forum on filter buttons suggested creating layer group to hold the layer
    // then can add/remove from it later
    var layerGroup = L.layerGroup([]);
    // adding the "all features" layer to the map as the default
    layerGroup.addLayer(geojsonLayerAll);
    layerGroup.addTo(map);
    
    // THIS CAN'T BE RIGHT, PASSING THEM IN AS OBJECTS? BUT IT SEEMS TO BE THE ONLY WAY IT WORKS?
    // need to return this group and the individual geojson layers to turn on and off with button
    var layers = {geojsonLayerAll, geojsonLayerWorse, geojsonLayerBetter, geojsonLayerSame};
    //console.log(layers);
    var group = {layerGroup};
    //console.log(group);
    
    return {group, layers};
}

// function for building an attributes array from the data
function processData(data){
    // empty array to hold attributes
    var attributes = [];
    // properties of the first feature in the dataset
    var properties = data.features[0].properties;
    // push each attribute name into attributes array
    for (var attribute in properties){
        // only take attributes with population values
        if (attribute.indexOf("MMR") > -1 && attribute.indexOf("DIFF") == -1){
            attributes.push(attribute);
        };
    };
    // check result
    //console.log(attributes);

    return attributes;
};

// function for resizing proportional symbols according to new attribute values from the slider/buttons
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        // eachlayer in the map including the tile layer are selected
        // so need to select just the circle marker layer hence if statement
        if (layer.feature && layer.feature.properties[attribute]){
            // access feature properties
            var props = layer.feature.properties;

            // update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            // call the createPopup function to recreate a popup after sequence change
            createPopup(props, attribute, layer, radius);
        };
    });
    
    // also need to update temporal legend with proper year
    updateLegend(map,attribute);
    
};

/*
// function for creating sequence controls
// ORIGINAL VERSION FROM LESSON
function createSequenceControls(map, attributes){
    // create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');
    // add skip buttons
    $('#panel').append('<button class="skip" id="reverse">Reverse</button>');
    $('#panel').append('<button class="skip" id="forward">Skip</button>');
    // replace button content with images
    $('#reverse').html('<img src="img/reverse.png" height="100%" width="100%">');
    $('#forward').html('<img src="img/forward.png" height="100%" width="100%">');
    
    //set slider attributes
    $('.range-slider').attr({
        max: 8, 
        min: 0,
        value: 0, // where along the slider it starts
        step: 1
    });
    
    // click listener for buttons
    $('.skip').click(function(){
        // get the old index value from the slider
        var index = $('.range-slider').val();
        // increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            // if past the last attribute, wrap around to first attribute
            index = index > 8 ? 0 : index;  // if index is ? 8 then set back to 0, if not stay current #
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            // if past the first attribute, wrap around to last attribute
            index = index < 0 ? 8 : index;
        };
        // update slider to match that new index so doesn't get out of sync from buttons
        $('.range-slider').val(index);
        //pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]); 
    });

    // input listener for slider
    $('.range-slider').on('input', function(){
        // get the new index value (0-8) to use for indexing the attributes val
        var index = $(this).val();
        //pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]);
    });
};
*/

// function for create new sequence controls (placing the sequence slider in corner of map)
// MODIFIED VERSION (some parts of original weren't working once in the L.Control.extent({}) ...)
// specifically parts where $() called specific elements by id or class instead of passing a variable
function createSequenceControls(map, attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // create range input element (slider)
            var rangeSlider = L.DomUtil.create('input', 'range-slider', container);
            $(rangeSlider).get(0).type = "range";
            
            // add reverse and skip buttons and add images as their content
            var reverseButton = L.DomUtil.create('button', 'skip', container);
            $(reverseButton).get(0).id = "reverse";
            $(reverseButton).html('<img src="img/reverse.png" height="100%" width="100%">');
            var skipButton = L.DomUtil.create('button', 'skip', container);
            $(skipButton).get(0).id = "forward";
            $(skipButton).html('<img src="img/forward.png" height="100%" width="100%">');

            
            // kill any mouse event listeners on the map (need to shut down the map's mouse event listeners just for the area covered by the control container so as trying to use slider or skip buttons it doesn't move the map too)
            $(container).on('mousedown dblclick', function(e){
                L.DomEvent.stopPropagation(e);
            });
            
            //set slider attributes
            $(rangeSlider).attr({
                max: 8, 
                min: 0,
                value: 0, // where along the slider it starts
                step: 1, 
            });

            // click listener for buttons
            var buttons = [reverseButton, skipButton];
            for (var i=0; i<buttons.length; i++){
                var button = buttons[i];
                $(button).click(function(){
                    // get the old index value from the slider
                    var index = $(rangeSlider).val();
                    // increment or decrement depending on button clicked
                    if ($(this).attr('id') == 'forward'){
                        index++;
                        // if past the last attribute, wrap around to first attribute
                        index = index > 8 ? 0 : index;  // if index is ? 8 then set back to 0, if not stay current #
                    } else if ($(this).attr('id') == 'reverse'){
                        index--;
                        // if past the first attribute, wrap around to last attribute
                        index = index < 0 ? 8 : index;
                    };
                    // update slider to match that new index so doesn't get out of sync from buttons
                    $(rangeSlider).val(index);
                    // pass new attribute to update symbols
                    updatePropSymbols(map, attributes[index]); 
                });   
            }

            // input listener for slider
            $(rangeSlider).on('input', function(){
                // get the new index value (0-8) to use for indexing the attributes val
                var index = $(this).val();
                // pass new attribute to update symbols
                updatePropSymbols(map, attributes[index]);
            });

            return container;
        }
    });

    map.addControl(new SequenceControl());
};

// function for creating temporal legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            // add legend element div to container
            $(container).append('<div id="temporal-legend">');
            
            // start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="250px" height="110px">';
            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];
            // loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){
                if (circles[i] == "max"){
                    var textY = 45;
                } else if (circles[i] == "mean"){
                    var textY = 72;
                } else {
                    var textY = 100;
                }
                //circle string
                svg += '<circle class="legend-circle" id="' + circles[i] + 
                '" fill="#ff3535" fill-opacity="0.8" stroke="#000000" cx="50"/>';
                // text string
                svg += '<text id="' + circles[i] + '-text" x="130" y="' + textY + '"></text>';
            };
            //close svg string
            svg += "</svg>";
            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
    
    updateLegend(map, attributes[0]);
};

// function for calculating the max, mean, and min values for a given attribute (to use in svg legend)
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };
            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });
    // set mean
    var mean = (max + min) / 2;
    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

// Update the legend (temporal and attribute) based on the change in sequence attribute
function updateLegend(map, attribute){
    // create content for legend
    var year = attribute.substr(3, 6);
    var content = "Maternal Mortality Rate in " + year + "<small> Deaths per 100,000 births</small>";
    // replace temporal legend content
    $('#temporal-legend').html(content);
    
    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);
    // for each get radius and y-axis coordinate and assign to attributes
    for (var key in circleValues){
        // get the radius
        var radius = calcPropRadius(circleValues[key]);
        // assign the cy and r attributes
        $('#'+key).attr({
            cy: 109 - radius,
            r: radius
        });
        // add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " deaths");
    };
};

// function for creating the "filter" interaction. Provides buttons for users to press and toggle on and off various versions of the MMR layer, providing the functionality of filtering by whether or not there was an increase or decrease in MMR from 2000 to 2016.
function createFilter(map, group, layers){
    var FilterControl = L.Control.extend({
        options: {
            position: 'topright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'filter-control-container');
            
            // add buttons for filtering content
            // first create active button for the current set of all features
            var showAllButton = L.DomUtil.create('button', 'filter active', container);
            $(showAllButton).get(0).id = "all-pts";
            $(showAllButton).html('Show All Countries');
            // next create a button for a subset of only features that saw worsening MMR from 2000-2016
            var worseButton = L.DomUtil.create('button', 'filter', container);
            $(worseButton).get(0).id = "got-worse-pts";
            $(worseButton).html('Where MMR is worse in 2016 than 2000');
            // next create a button for a subset of only features that saw the same MMR in 2000 & 2016
            var sameButton = L.DomUtil.create('button', 'filter', container);
            $(sameButton).get(0).id = "stayed-same-pts";
            $(sameButton).html('Where MMR is the same in 2016 and 2000');
            // lastly create a button for a subset of only features that saw improving MMR from 2000-2016
            var betterButton = L.DomUtil.create('button', 'filter', container);
            $(betterButton).get(0).id = "got-better-pts";
            $(betterButton).html('where MMR is better in 2016 than 2000');

            // THIS SECTION STILL NEEDS A LOT OF WORK!!! NOT FUNCTIONAL
            // click listener for buttons
            var buttons = [showAllButton, worseButton, betterButton, sameButton];
            for (var i=0; i<buttons.length; i++){
                var button = buttons[i];
                $(button).click(function(){
                    if ($(this).attr('id') == 'got-worse-pts'){
                        // if MMR_DIFF_2000_2016 > 0
                        // pick which layer we want to turn on with this button
                        var filterlayer = layers.geojsonLayerWorse;
                        // mark this button as class active and turn off others class active
                        $(this).addClass('active').siblings().removeClass('active');
                    } else if ($(this).attr('id') == 'got-better-pts'){
                        // if MMR_DIFF_2000_2016 < 0
                        // pick which layer we want to turn on with this button
                        var filterlayer = layers.geojsonLayerBetter;
                        // mark this button as class active and turn off others class active
                        $(this).addClass('active').siblings().removeClass('active');
                    } else if ($(this).attr('id') == 'stayed-same-pts'){
                        // if MMR_DIFF_2000_2016 = 0
                        // pick which layer we want to turn on with this button
                        var filterlayer = layers.geojsonLayerSame;
                        // mark this button as class active and turn off others class active
                        $(this).addClass('active').siblings().removeClass('active');
                    } else{
                        // NO FILTER. ALL FEATURES.
                        // pick which layer we want to turn on with this button
                        var filterlayer = layers.geojsonLayerAll;
                        // mark this button as class active and turn off others class active
                        $(this).addClass('active').siblings().removeClass('active');
                    };
                    
                    // call other function to turn on and off the appropriate layers based on which button was clicked
                    updateLayerOn(map, group.layerGroup, filterlayer); 
                });   
            }

            return container;
        }
    });

    map.addControl(new FilterControl());
};

// function for turning on and off layers in the map (called within the createFilter function by each button)
function updateLayerOn (map, group, filterlayer) { 
    // remove current layers from map
    group.clearLayers();
    map.removeLayer(group);
    // add correct new layer to map
    group.addLayer(filterlayer);
    group.addTo(map);
}

// function to retrieve the data and place it on the map
function getData(map){
    // load the data and use pointToLayer function to change symbology & add popup
    $.ajax("data/MaternalMortalityRates.geojson", {
        dataType: "json",
        success: function(response){
            // create an attributes array
            var attributes = processData(response);
            
            // call createPropSymbols function to create the point markers and popups
            var {group, layers} = createPropSymbols(response, map, attributes);
            //console.log(group);
            //console.log(group.layerGroup); // THIS IS HOW TO ACCESS INSIDE GROUP
            //console.log(layers);
            //console.log(layers.geojsonLayerAll); // THIS IS HOW TO ACCESS INSIDE LAYERS
            
            // call the createSequenceControls function to create the slider
            createSequenceControls(map, attributes);
            // call the createLegend function to create the legend
            createLegend(map, attributes);
            // call the createFilter function to create the filter menu
            createFilter(map, group, layers);
        }
    });
};

$(document).ready(createMap);