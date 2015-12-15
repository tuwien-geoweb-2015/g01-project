// Base map
var osmLayer = new ol.layer.Tile({source: new ol.source.OSM()});

// Census map layer
var wmsLayer = new ol.layer.Image({
  source: new ol.source.ImageWMS({
    url: 'http://student.ifip.tuwien.ac.at/geoserver/wms',
    params: {'LAYERS': 'g01_2015:normalized,g01_2015:BEZIRKSGRENZEOGDPolygon,g01_2015:CARSHARINGOGDPoint,g01_2015:CITYBIKEOGDPoint,g01_2015:OEFFHALTESTOGDPoint'}
  }),
  opacity: 0.8
});

// Map object
olMap = new ol.Map({
  target: 'map',
  renderer: 'canvas',
  layers: [osmLayer, wmsLayer],
  view: new ol.View({
    center: ol.proj.fromLonLat([16.373064, 48.20833]),
    zoom: 11.5,
    maxZoom: 18
  })
});

// Load variables into dropdown
$.get("DataDict.txt", function(response) {
    console.log(response);
    var data = response.split('\n');
    
    $(data).each(function(index, line) {
    $('#topics').append($('<option>')
      .val(line.split(';')[0].trim())
      .html(line.split(';')[1].trim()));
  });
});

// Add behaviour to dropdown
$('#topics').change(function() {
  wmsLayer.getSource().updateParams({
    'viewparams': 'column:' + $('#topics>option:selected').val()
  });
});

// Create an ol.Overlay with a popup anchored to the map
var popup = new ol.Overlay({
  element: $('#popup')
});
olMap.addOverlay(popup);

// Handle map clicks to send a GetFeatureInfo request and open the popup
olMap.on('singleclick', function(evt) {
  var view = olMap.getView();
  var url = wmsLayer.getSource().getGetFeatureInfoUrl(evt.coordinate,
      view.getResolution(), view.getProjection(), {'INFO_FORMAT': 'text/html'});
  popup.setPosition(evt.coordinate);
  $('#popup-content iframe').attr('src', url);
  $('#popup')
    .popover({content: function() { return $('#popup-content').html(); }})
    .popover('show');
    
  // Close popup when user clicks on the 'x'
  $('.popover-title').click(function() {
    $('#popup').popover('hide');
  });
  $('.popover form')[0].onsubmit = function(e) {
    var feature = new ol.Feature();
    feature.setGeometryName('geom');
    feature.setGeometry(new ol.geom.Point(evt.coordinate));
    feature.set('comment', this.comment.value);
    var xml = new ol.format.WFS().writeTransaction([feature], null, null, {
      featureType: 'comments', featureNS: 'http://g01/2015',
      gmlOptions: {srsName: 'EPSG:4326'}
    });
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://student.ifip.tuwien.ac.at/geoserver/wfs', true);
    xhr.onload = function() {
      wmsLayer.getSource().changed();
      alert('Thanks for your comment.');
    };
    xhr.send(new XMLSerializer().serializeToString(xml));
    e.preventDefault();
  };
});

// Submit query to Nominatim and zoom map to the result's extent
var form = document.getElementById('navform');
form.onsubmit = function(evt) {
  var url = 'http://nominatim.openstreetmap.org/search?format=json&q=';
  url = form.query.value;
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onload = function() {
    var result = JSON.parse(xhr.responseText);
    if (result.length > 0) {
      var bbox = result[0].boundingbox;
      olMap.getView().fit(ol.proj.transformExtent([parseFloat(bbox[2]),
          parseFloat(bbox[0]), parseFloat(bbox[3]), parseFloat(bbox[1])],
          'EPSG:4326', 'EPSG:4326'), olMap.getSize());
    }
  };
  xhr.send();
  evt.preventDefault();
};
