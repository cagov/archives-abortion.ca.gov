const tile_template =
  "https://d1436ootlg562q.cloudfront.net/tiles/calstamen/{z}/{x}/{y}{r}.png";
// use for debugging
// const tile_template = "https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png";
// Will need to use the two attributions for the Map Credits pop-up
const max_zoom = 15;
const max_retina = 10;
const poi_near_max_zoom = 15;
const poi_far_max_zoom = 8; // 6.5;
const initial_center = [37.561997, -120.629879];
const initial_zoom = 5.8;
var northWest = L.latLng(43, -130),
    southEast = L.latLng(32, -109),
    calif_bounds = L.latLngBounds(northWest, southEast);

export class CaGovAbortionProviderMap extends window.HTMLElement {
  connectedCallback() {
    // console.log("Init map");
    let translationKeys = ['mapTitle','mapCredits','allProvidersNear','phoneLabel', 'moveMapLabel', 'mapAttribution', 'tileAttribution', 'textAttribution'];
    this.mapTitle = 'Provider map';
    this.mapCredits = 'Map credits';
    this.allProvidersNear = 'All providers near';
    this.phoneLabel = 'Phone';
    this.moveMapLabel = 'Move the map to update search results below.';
    this.mapAttribution =
    '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">Leaflet</a>';
    this.tileAttribution =
    'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    this.textAttribution =
    "Map by Leaflet, Map tiles by Stamen Design, CC BY 3.0, Map data by OpenStreetMap contributors";

    this.searchfilters = {'telehealth':false,'pill':false,'procedure':false};
    this.listComponent = document.querySelector(
      "cagov-abortion-provider-list"
    );
    this.marker_is_showing = false;
    this.marker_started = true;
    this.marker_item = undefined;
    this.open_marker = undefined;

    this.selIcon = new L.Icon({
      iconUrl: '/images/marker-icon-sel-2x.png',
      shadowUrl: '/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    this.regIcon = new L.Icon({
      iconUrl: '/images/marker-icon-2x.png',
      shadowUrl: '/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // setup touch event handling
    window.L.Map.mergeOptions({
      touchExtend: true
    });
    window.L.Map.TouchExtend = window.L.Handler.extend({
      initialize: function(map) {
        this._map = map;
        this._container = map._container;
        this._pane = map._panes.overlayPane;
      },

      addHooks: function() {
        window.L.DomEvent.on(this._container, 'touchstart', this._onTouchStart, this);
        window.L.DomEvent.on(this._container, 'touchend', this._onTouchEnd, this);
        window.L.DomEvent.on(this._container, 'touchmove', this._onTouchMove, this);
      },

      removeHooks: function () {
        window.L.DomEvent.off(this._container, 'touchstart', this._onTouchStart);
        window.L.DomEvent.off(this._container, 'touchend', this._onTouchEnd);
        window.L.DomEvent.off(this._container, 'touchmove', this._onTouchMove);
      },
    
      _onTouchEvent: function (e, type) {
        if (!this._map._loaded) { return; }

        // alert("GTS");

        var touch = e.touches[0];
        var containerPoint = window.L.point(touch.clientX, touch.clientY);
        var layerPoint = this._map.containerPointToLayerPoint(containerPoint);
        var latlng = this._map.layerPointToLatLng(layerPoint);
        this._map.fire(type, {
          latlng: latlng,
          layerPoint: layerPoint,
          containerPoint: containerPoint,
          originalEvent: e
        });
      },

      _onTouchStart: function (e) {
        this._onTouchEvent(e,'touchstart');
      },
      _onTouchMove: function (e) {
        this._onTouchEvent(e,'touchmove');
      },
      _onTouchEnd: function (e) {
        if (!this._map._loaded) { return; }
        this._map.fire('touchend', {
          originalEvent: e
        });
      },
    });
    window.L.Map.addInitHook('addHandler', 'touchExtend', window.L.Map.TouchExtend);
    
    // The map component is written into the page dynamically so custom element isn't in an 11ty HTML file, hence using document. instead of this. to get the translated values here
    translationKeys.forEach(key => {
      if(document.querySelector(`[data-name="${key}"]`)){
        this[key] = document.querySelector(`[data-name="${key}"]`).innerHTML;
      }
    })

    this.searchComponent = document.querySelector(
      "cagov-abortion-provider-lookup"
    );

    this.innerHTML = `<h3>${this.mapTitle}</h3>
      <p>${this.moveMapLabel}</p>
      <div id="map-popup" class="provider-card popup">
        <!-- begin placeholder -->
        <div class="provider-card-container">
          <h2 class="h4">FPA Women's Health - Fresno</h2>
          <div class="services">
            <span class="services-list-label">Services</span>
            <ul class="services-list">
            <li class="telehealth">
              <span class="service-icon">
                <img src="/assets/img/telehealth.svg" width="16px">
              </span>
              Telehealth available
            </li>
            
              <li>
                <span class="service-icon">
                  <img src="/assets/img/pill.svg" width="16px">
                </span>
                Abortion pill (for pickup)
              </li>
              <li>
                <span class="service-icon">
                  <img src="/assets/img/pillmail.svg" width="16px">
                </span>
                Abortion pill (by mail)
              </li>
              <li>
                <span class="service-icon">
                  <img src="/assets/img/procedure.svg" width="16px">
                </span>
                Procedure
              </li>
            </ul>
          </div>
          <div class="provider-info">
            <div class="provider-address">
              <span class="provider-icon">
                <img src="/assets/img/location_v2.svg" width="28px" alt="Address">
              </span>
              <span class="provider-address-line"><a target="_blank" href="https://maps.google.com/?q=165 North Clark Street, Fresno, CA 93701">165 North Clark Street, Fresno, CA 93701</a></span>
            </div>
            <div class="provider-phone">
              <span class="provider-icon">
                <img src="/assets/img/phone_v2.svg" width="28px" alt="Phone number">
              </span>
              <a href="tel:(559) 233-8657">(559) 233-8657</a>
            </div>
            <div class="provider-website">
              <span class="provider-icon">
                <img src="/assets/img/website_v2.svg" width="28px">
              </span>
              <a href="https://www.fpawomenshealth.com/contents/locations/central-valley/fresno" target="_blank" alt="">Provider website</a>
              </div>
          </div>
        </div>
        <!-- end placeholder -->
      </div>
      <div id="map"></div>
      <div id="map-credits"><a id="map-credits-a" href="#" title="${this.textAttribution}">${this.mapCredits}</a></div>
      <div id="credits-tooltip" style="display:none;">${this.mapAttribution} ${this.tileAttribution}</div>
      `;

    // leaflet creates the L object on window
    this.map = window.L.map("map", {
      maxBounds: calif_bounds,
      center: initial_center,
      zoom: initial_zoom,
      dragging: !L.Browser.mobile,
      tap: !L.Browser.mobile,
      attributionControl: false,
    });
    this.map.on('click',(e) => {
      // console.log("map click");
      this.closePopup();
    });

    window.L.tileLayer(tile_template.replace("{r}", ""), {
      // retina tiles
      minZoom: 0,
      maxZoom: max_zoom,
      maxNativeZoom: max_zoom,
      // attribution: this.tileAttribution,
    }).addTo(this.map);

    if (this.searchComponent.data) {
      this.data = this.searchComponent.data;
    }
    if (this.data) {
      this.displayPins();
    }

    this.listenForData();
    this.listenForRecenter();

    this.map.on("movestart", (e) => {
      // console.log("moveend");
      if (!this.marker_started) {
        this.closePopup();
      }
      this.marker_started = false;
  });

    this.map.on("moveend", (e) => {
      // console.log("moveend");
      this.mapCenter = this.map.getCenter();
      this.populateCardList();
    });

    this.note_popup = undefined;

    // dynamic map zoom to prevent zooming into areas for with no POIs, where we have no tiles.
    this.map.on(
      "moveend",
      function () {
        // leave in for future debugging
        // console.log(
        //   "center",
        //   this.map.getCenter().toString(),
        //   "zoom",
        //   this.map.getZoom()
        // );
        if (this.data == undefined) {
          // early return if this.data not yet loaded
          return;
        }
        var poi_is_near = false;
        const bbox = this.map.getBounds().pad(0.3); // padding provides some slack...
        for (var i = 0; i < this.data.length; ++i) {
          // using a loop to benefit from early break
          const item = this.data[i];
          const latlng = L.latLng(this.data[i].lat, this.data[i].lng);
          // if lat,lng is onscreen
          if (bbox.contains(latlng)) {
            poi_is_near = true;
            break;
          }
        }
        const mz = poi_is_near ? poi_near_max_zoom : poi_far_max_zoom;
        this.map.setMaxZoom(mz);
      }.bind(this)
    );


    this.map.on('touchmove',
      function(e) {
        var nbrTouches = e.originalEvent.touches.length;
        // alert("got touch event " + nbrTouches);
        var singleTouchPromptContent = document.querySelector('#single-touch-prompt-content').innerHTML;
        if (nbrTouches == 1 && this.note_popup == undefined) {
          this.note_popup = L.popup()
            .setLatLng(this.map.getCenter())
            .setContent(singleTouchPromptContent)
            .openOn(this.map);
        } else if (nbrTouches != 1 && this.note_popup) {
          this.note_popup.close();
          this.note_popup = undefined;
        }
      }.bind(this)
    );

    this.map.on('touchend',
      function(e) {
          if (this.note_popup != undefined) {
            this.note_popup.close();
            this.note_popup = undefined;
          }
        }.bind(this)
    );

  }

  listenForData() {
    // listen for custom event, when received render all points
    // this.searchComponent.addEventListener(
    //   "gotProviderData",
    //   (e) => {
    //     this.data = this.searchComponent.data;
    //     this.displayPins();
    //   },
    //   false
    // );
  }

  listenForRecenter() {
    // listen for recenter custom event from search form
    this.searchComponent.addEventListener(
      "newCity",
      (e) => {
        this.closePopup();

        // leave in for future debugging
        // console.log("NEW CITY",this.searchComponent.currentCity);
        if (this.searchComponent.currentCity) {
          // console.log("Treating as set city");
          this.map.setView(this.searchComponent.currentCity.latlon, 10, {animate: true, duration: 1.5});
          this.querySelector("h3").innerHTML =
          this.allProvidersNear + " " + this.searchComponent.currentCity.city;
        } else {
          this.querySelector("h3").innerHTML = this.mapTitle;
          this.map.flyTo(initial_center, initial_zoom, {animate: true, duration: 0.5});
        }
        location.hash = '';
        location.hash = '#map';
        // this.populateCardList();
      },
      false
    );

    this.searchComponent.addEventListener(
      "doFilter",
      (e) => {
        // leave in for future debugging
        // console.log("DOFILTER");
        this.populateCardList();
      },
      false
    );
   
  }

  closePopup() {
    document.querySelector('#map-popup').style.display = 'none';
    let map_result_elem = document.querySelector('#map-results');
    if (map_result_elem) {
       map_result_elem.classList.remove('with-popup');
    }
    this.marker_is_showing = false;
    this.marker_item = undefined;
    if (this.open_marker) {
      this.open_marker.setIcon(this.regIcon);
      this.open_marker = undefined;
    }
  }

  openPopup(item, marker) {
    this.marker_item = item;

    if (this.open_marker != undefined) {  // close any open marker
      this.open_marker.setIcon(this.regIcon);
    }

    this.open_marker = marker;
    this.open_marker.setIcon(this.selIcon);
    const markup = this.listComponent.writeProviderCard(item,true);
    let map_popup = document.querySelector('#map-popup');
    map_popup.innerHTML = markup;
    let cbutton = map_popup.querySelector('.close-button');
    if (cbutton) {
      cbutton.addEventListener('click', (e) => {
        this.closePopup();
      });
    }

    document.querySelector('#map-popup').style.display = 'block';
    let map_result_elem = document.querySelector('#map-results');
    if (map_result_elem) {
       map_result_elem.classList.add('with-popup');
    }
    this.marker_is_showing = true;
    // check if lng is > map centers
    const cur_center = this.map.getCenter();
    const cur_bounds = this.map.getBounds();
    if (window.innerWidth > 768 ) {
    //   if (item.lat < cur_center.lat) {
    //     const new_center = L.latLng(cur_center.lat + (cur_bounds.getSouth() - cur_bounds.getNorth())/4, cur_center.lng);
    //     this.map.panTo(new_center, {animate: true, duration: 1.0});
    //   }
    //  } else {
      if (item.lng > cur_center.lng) {
        // reposition marker half way between center and left edge of map
        const new_center = L.latLng(cur_center.lat,cur_center.lng + (cur_bounds.getEast() - cur_bounds.getWest())/4);
        this.marker_started = true; // used to skip closing marker at end of movement
        this.map.panTo(new_center, {animate: true, duration: 1.0});
      }
    }
  }

  displayPins() {
    // console.log("Making display pins");
    this.allMarkers = [];

    // Used to filter out markers that outside of the State's bounding rectangle
    const cal_bounds = L.latLngBounds([42, -125], [32.5, -114]);

    // the data gets set on this object from provider-search component
    this.data.forEach((item) => {
      const latlng = L.latLng(item.lat, item.lng);
      if (cal_bounds.contains(latlng)) {
        let marker = L.marker([item.lat, item.lng],{icon:this.regIcon, keyboard:false,riseOnHover:true,highlight: 'temporary'}).addTo(this.map);

        // let cardContent = `<p><a href="${item.formatted_url}">${item.formatted_name}</a><br>
        // ${item.full_address}</p>
        // <p>${this.phoneLabel}: <a href="tel:${item.formatted_phone}">${item.formatted_phone}</a></p>`;

        // marker.bindPopup(cardContent);
        marker.on('click',(e) => {
          // console.log("Marker click",item);
          if (this.marker_is_showing && this.marker_item === item) {
            this.closePopup();
          } else {
            this.openPopup(item, e.target);
          }
        });
        this.allMarkers.push(marker);
        item.itsMarker = marker;
      }
    });
    // this.populateCardList();
    this.handleMapCredits();
  }

  handleMapCredits() {
    // not yet working...
      var map_credit_elem = document.querySelector("#map-credits-a");
      map_credit_elem.addEventListener("click", (event) => {
        event.preventDefault();
        var credits_tooltip = document.querySelector('#credits-tooltip');
        if (credits_tooltip.style.display === "none") {
          credits_tooltip.style.display = "block";
        } else {
          credits_tooltip.style.display = "none";
        }
      });
  }

  doResultFiltering(indata) {
    // console.log("doResultFiltering");
    var olddata = indata;
    olddata.forEach(rec => {
      rec.itsMarker.remove();
    })

    // AND filter -- no checkboxes shows everything, selecting a checkbox shows fewer things, all checkboxes show the fewest things
    // var outdata = indata.filter(rec => {
    //   const kservices = rec.known_offerings.join(',');
    //   const unknown_pill = kservices.includes('medication_abortion_pill') && !kservices.includes('pill_delivery') && !kservices.includes('pill_visit');
    //   return (!this.searchfilters.telehealth || kservices.includes('tele')) &&
    //     (
    //       (!this.searchfilters.pillmail || (kservices.includes('pill_delivery') || unknown_pill)) &&
    //       (!this.searchfilters.pillpickup || (kservices.includes('pill_visit') || unknown_pill)) &&
    //       (!this.searchfilters.procedure || kservices.includes('surgical'))
    //     );
    // });

    // OR FILTER -- no checkboxes shows nothing, selecting a checkbox shows more things, selecting all checkboxes shows the most things
    // var outdata = indata.filter(rec => {
    //   const kservices = rec.known_offerings.join(',');
    //   const unknown_pill = kservices.includes('medication_abortion_pill') && !kservices.includes('pill_delivery') && !kservices.includes('pill_visit');
    //   return (this.searchfilters.telehealth && kservices.includes('tele')) ||
    //     (
    //       (this.searchfilters.pillmail && (kservices.includes('pill_delivery') || unknown_pill)) ||
    //       (this.searchfilters.pillpickup && (kservices.includes('pill_visit') || unknown_pill)) ||
    //       (this.searchfilters.procedure && kservices.includes('surgical'))
    //     );
    // });


    // // COMPOUND FILTER -- telehealth AND (pill OR procedure) - not super intuitive... selecting telehealth with nothing else shows nothing
    var outdata = indata.filter(rec => {
      const kservices = rec.known_offerings.join(',');
      const no_service_filters_requested = !(this.searchfilters.pill || this.searchfilters.procedure);
      return (!this.searchfilters.telehealth || kservices.includes('tele')) &&
        (
          no_service_filters_requested ||
          (this.searchfilters.pill && (kservices.includes('_pill') || kservices.includes('pill_'))) ||
          (this.searchfilters.procedure && kservices.includes('surgical'))
        );
    });
    // console.log("Filtered result",outdata.length);
    outdata.forEach(rec => {
      rec.itsMarker.addTo(this.map);
    })
    return outdata;
  }

  populateCardList() {
    this.inBoundsList = [];
    let mapBounds = this.map.getBounds();
    this.data.forEach((point) => {
      if (
        parseFloat(point.lat) < parseFloat(mapBounds._northEast.lat) &&
        parseFloat(point.lat) > parseFloat(mapBounds._southWest.lat) &&
        parseFloat(point.lng) < parseFloat(mapBounds._northEast.lng) &&
        parseFloat(point.lng) > parseFloat(mapBounds._southWest.lng)
      ) {
        this.inBoundsList.push(point);
      }
    });

    // Filter HERE
    this.inBoundsList = this.doResultFiltering(this.inBoundsList);


    // change to be only every pin within bounds
    this.dispatchEvent(new Event("mapProviderData"));
  }
}
window.customElements.define(
  "cagov-abortion-provider-map",
  CaGovAbortionProviderMap
);
