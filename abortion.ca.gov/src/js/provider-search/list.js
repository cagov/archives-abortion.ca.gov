import "@cagov/ds-pagination";

// web component that lists providers
// can accept a listen parameter for events from a map
// can accept a start parameter for initial set to display immediately

// where does it get the data?
// does nothing by itself, just listens for render event set on itself
// then displays the data it received before that event fired

//the search lookup component sets the data and sends render event when desired

export class CaGovAbortionProviderList extends window.HTMLElement {
  connectedCallback() {
    // console.log("Init list");
    let translationKeys = [
      "searchResults",
      "procedureLabel",
      "telehealthLabel",
      "telehealthOnly",
      "telehealthOnlyOptions",
      "telehealthCardCaption",
      "telehealth_choix",
      "telehealth_heyjane",
      "telehealth_abortionondemand",
      "telehealth_abortiontelemedicine",
      "pillLabel",
      "pillLabel_mail",
      "pillLabel_pickup",
      "servicesListLabel",
      "searchAgainLabel",
      "searchResultsTotalLabel",
      "addressAltText",
      "phoneNumberAltText",
      "providerWebsiteAltText",
      "filterHeader",
      "filterPill",
      "filterTelehealth",
      "filterProcedure",
      "n_milesAway",
    ];
    this.translations = {};
    this.translations.searchResults = "Search results";
    this.translations.searchResultsTotalLabel = `Showing <span class="total-label">0</span> of <span class="page-count">0</span> results`;
    this.translations.procedureLabel = "filterProcedure";
    this.translations.telehealthLabel = "Telehealth available";
    this.translations.telehealthOnly = "Telehealth only";
    this.translations.telehealthOnlyOptions = "Telehealth only options";
    this.translations.telehealthCardCaption = "You can contact a California-based telehealth service:";
    this.translations.telehealth_choix = "Choix Health";
    this.translations.telehealth_heyjane = "Hey Jane";
    this.translations.telehealth_abortionondemand = "Abortion on Demand";
    this.translations.telehealth_abortiontelemedicine = "Abortion Telemedicine";
    this.translations.pillLabel = "Abortion pill";
    this.translations.pillLabel_mail = "Abortion pill by mail";
    this.translations.pillLabel_pickup = "Abortion pill for pickup";
    this.translations.servicesListLabel = "Services";
    this.translations.addressAltText = "Address";
    this.translations.phoneNumberAltText = "Phone number";
    this.translations.providerWebsiteAltText = "Provider website";
    this.translations.filterHeader = "Filter by services";
    this.translations.filterTelehealth = "Telehealth availableFilter by services";
    this.translations.filterPill = "Abortion pill";
    this.translations.filterProcedure = "filterProcedure";
    this.translations.n_milesAway = "{N} miles away";
    this.menu_is_open = false;
    this.first_time = true;
    this.telehealth_urls = ['https://choixhealth.com/',
                            'https://www.heyjane.co/',
                            'https://abortionondemand.org/',
                            'https://www.abortiontelemedicine.com/'];

    // @TODO 3 paginated & search result strings to fix

    // The list component is written into the page dynamically so custom element isn't in an 11ty HTML file, hence using document. instead of this. to get the translated values here
    translationKeys.forEach((key) => {
      if (document.querySelector(`[data-name="${key}"]`)) {
        this.translations[key] = document.querySelector(
          `[data-name="${key}"]`
        ).innerHTML;
      }
    });

    this.searchComponent = document.querySelector(
      "cagov-abortion-provider-lookup"
    );
    this.ourMapComponent = document.querySelector(
      "cagov-abortion-provider-map"
    );
    this.pageSize = 6;

    if (this.dataset.listen) {
      this.listenforDataFromMap();
    }
    // see if there already is data on map, if so display
    if (this.ourMapComponent.inBoundsList) {
      this.beginDisplay();
    }
  }

  listenforDataFromMap() {
    this.ourMapComponent.addEventListener(
      "mapProviderData",
      (e) => {
        this.beginDisplay();
      },
      false
    );
  }

  beginDisplay() {
    // console.log("begin display");
    this.data = this.sortData(this.ourMapComponent.inBoundsList, this.ourMapComponent.mapCenter);
    // this telehealth is only shown if the filter is not set to just in-clinic procedures
    var telehealth_card_ok = !((this.ourMapComponent.searchfilters.procedure && !this.ourMapComponent.searchfilters.telehealth && !this.ourMapComponent.searchfilters.pill));
    // console.log("Search filters: " + this.ourMapComponent.searchfilters);
    if (telehealth_card_ok) {
      var telehealth_record = {'formatted_name':this.translations.telehealthOnlyOptions,'telehealth_card':true};
      this.data.unshift(telehealth_record);
    }
    if (!this.searchComponent.currentCity) { 
      // clear distance so we don't dispay it
      this.ourMapComponent.inBoundsList.forEach(rec => { rec.distanceInMiles = undefined;})
    }
    // console.log("First listing: ",this.data[0]);
    this.currentPage = 0;
    this.displayProviders();
  }

  sortData(markersInBounds, center) {
    // console.log("RESORT");
    if (this.searchComponent.currentCity) {
      const latlon = this.searchComponent.currentCity.latlon;
      center = {'lat':latlon[0],'lng':latlon[1]};
      // console.log("  CITY CENTER",center);
    } else {
      // console.log("  MAP CENTER",center);
    }
    markersInBounds.forEach(rec => { rec.distanceInMiles = undefined;})
    if(!center) {
      return [];
    } else {
      // Calculate this once and store in miles
      const metersPerMile = 1609.34;
      markersInBounds.forEach(rec => { rec.distanceInMiles = getDistanceBetweenPoints(parseFloat(rec.lat), parseFloat(rec.lng), center.lat, center.lng) / metersPerMile ;})
      return markersInBounds.sort(function distanceCompare(a,b) {
        let aDistance = a.distanceInMiles; // getDistanceBetweenPoints(parseFloat(a.lat), parseFloat(a.lng), center.lat, center.lng);
        let bDistance =b.distanceInMiles; //  getDistanceBetweenPoints(parseFloat(b.lat), parseFloat(b.lng), center.lat, center.lng);
        if (aDistance < bDistance)
            return -1;
        if (aDistance > bDistance)
          return 1;
        return 0;
      });
    }
  }

  handleFilterButton(e) {
    // console.log("Got Filter Changed",e);
    for (const [key, value] of Object.entries(this.ourMapComponent.searchfilters)) {
      const elem = this.querySelector('input#filter_'+key);
      this.ourMapComponent.searchfilters[key] = elem.checked;
    }
    // console.log("New search filters: ", this.ourMapComponent.searchfilters);
    // set up filters
    // reprocess the list
    // redraw the POIs and the paginated cards (this.displayProviders)
    // this.beginDisplay();
    this.searchComponent.dispatchEvent(new Event("doFilter"));
  }

  displayProviders() {
    // console.log("displayProviders (Cards)")
    // see if there is already an object and if so remove listeners
    if (this.querySelector("cagov-pagination")) {
      this.querySelector("cagov-pagination").removeEventListener(
        "paginationClick",
        this.boundPaginationHandler,
        true
      );
    }
 
    // this only gets called on page 1 so start at 0
    let thisPageItems = this.data.slice(0, this.pageSize);
    const totalValue =
      this.data.length > 6
        ? `${this.currentPage * this.pageSize + 1} - ${
            this.pageSize * (this.currentPage + 1)
          }`
        : this.data.length;

    const totalLabel = `<span class="total-label">${ totalValue }</span>`;
    let searchResultsTotalLabel = this.translations.searchResultsTotalLabel.replace(`<span class="total-label">0</span>`, totalLabel).replace(`<span class="page-count">0</span>`, this.data.length);
    

    this.innerHTML = `<div id="map-results">
      <h3>${this.translations.searchResults}</h3>
      <div class="total-results">
        <span id="total">
          ${searchResultsTotalLabel}
        </span>
      </div>
      <!-- begin filter buttons -->
      <!-- not translated at the moment -->
      <div id="filter-pulldown" class="${this.menu_is_open? "open" : ""}">
        <div id="filter-pulldown-header">
          <span class="service-icon">
                  <img src="/assets/img/filter_icon.svg" width="16px"/>
          </span>
          <span id="filter-services-label">${this.translations.filterHeader}</span>
          <span class="service-icon dropdown-icon">
            <img src="/assets/img/dropdown_icon.svg" width="16px"/>
          </span>
        </div>
        <div id="filter-pulldown-content">
        <input type="checkbox" class="searchfilterbutton" id="filter_telehealth" ${this.ourMapComponent.searchfilters.telehealth? 'checked' : ''} name="${this.translations.filterTelehealth}"> <label for="filter_telehealth">${this.translations.filterTelehealth}</label>      
        <br />
        <hr class="menu-divider" />
        <input type="checkbox" class="searchfilterbutton" id="filter_pill" ${this.ourMapComponent.searchfilters.pill? 'checked' : ''} name="${this.translations.filterPill}"> <label for="filter_pill">${this.translations.filterPill}</label>
        <br />
        <input type="checkbox" class="searchfilterbutton" id="filter_procedure" ${this.ourMapComponent.searchfilters.procedure? 'checked' : ''} name="${this.translations.filterProcedure}"> <label for="filter_procedure">${this.translations.filterProcedure}</label>
        </div>
      </div>
      <!-- end filter buttons -->
      <div class="results-container">
        <ul class="results-list">
          ${this.writeProviderList(thisPageItems)}
        </ul>
      </div>
      <cagov-pagination data-current-page="${
        this.currentPage + 1
      }" data-total-pages="${Math.ceil(
      this.data.length / this.pageSize
    )}"></cagov-pagination>
    </div>`;

    const telehealth_subs = this.querySelectorAll("li.provider-subcard-item");
    telehealth_subs.forEach((subcard, idx) => {
      subcard.addEventListener(
        "click",
        (e) => {
          let url = this.telehealth_urls[idx];
          // console.log(`Clicked on telehealth subcard: ${idx} -> ${url}`);
          window.location.href = url;
        },
        true,
      );
    });
    


    const menuHeader = this.querySelector("div#filter-pulldown-header");
    menuHeader.addEventListener(
      "click",
      (e) => {
        // console.log("Got pulldown click",this.menu_is_open);
        this.menu_is_open = !this.menu_is_open;
        var pdMenu = this.querySelector('div#filter-pulldown');
        if (this.menu_is_open) {
          pdMenu.classList.add('open');
        } else {
          pdMenu.classList.remove('open');
        }
      },
      true
    );

    if (this.first_time) { // click outside menu handler
      window.addEventListener('click', function(e){   
        if (document.getElementById('filter-pulldown').contains(e.target)){
        } else{
          var pdMenu = this.querySelector('div#filter-pulldown');
          pdMenu.classList.remove('open');
          this.menu_is_open = false;
        }
      }.bind(this));    
      this.first_time = false;
    }

    const paginator = this.querySelector("cagov-pagination");
    this.boundPaginationHandler = this.handlePagination.bind(this);
    paginator.addEventListener(
      "paginationClick",
      this.boundPaginationHandler,
      true
    );

    const buttons = this.querySelectorAll("input.searchfilterbutton");
    // console.log("Buttons length",buttons.length);
    buttons.forEach((elem) => {
      elem.addEventListener("change",
        this.handleFilterButton.bind(this),
        true);
    });
   
    
  }

  handlePagination(e) {
    this.currentPage = parseInt(e.detail) - 1;
    let pageStart = this.currentPage * this.pageSize;
    let pageEnd = pageStart + this.pageSize;
    let newPaginatedSubset = this.data.slice(pageStart, pageEnd);
    this.querySelector(".results-list").innerHTML = this.writeProviderList(
      newPaginatedSubset
    );

    const totalLabel = `<span class="total-label">${ pageStart + 1 } - ${pageEnd}</span>`;
    let searchResultsTotalLabel = this.translations.searchResultsTotalLabel.replace(`<span class="total-label">0</span>`, totalLabel).replace(`<span class="page-count">0</span>`, this.data.length);
    
    // Update result total
    this.querySelector("#total").innerHTML = searchResultsTotalLabel;
    // Navigate to top of search results
    location.hash = "#"; // <-- leave this in, needed to reset location when already set
    location.hash = "#map-results";
  }

  writeTelehealthOnlyProviderCard(item) {
    // where do these come from?
    let translations = this.translations;
    let fixed_items = [translations.telehealth_choix,
                        translations.telehealth_heyjane,
                        translations.telehealth_abortionondemand,
                        translations.telehealth_abortiontelemedicine];
    for (var i = 0; i < fixed_items.length; i++) {
      fixed_items[i] = fixed_items[i].replace("&lt;b&gt;", '<b>');
      fixed_items[i] = fixed_items[i].replace("&lt;/b&gt;", '</b>');
    }

    let item_list_markup = '<ul class="teleprovider-list">';
    for (var i = 0; i < fixed_items.length; i++) {
      item_list_markup += `<li class="provider-subcard-item" data-telehealth-idx=${i+1}>${fixed_items[i]}</li>`;
    }
    item_list_markup += '</ul>';

    return `<div class="provider-card-container telehealth-card-container">
    <h2 class="h4 telehealth-title"><img class="telehealth-circle-icon" src="/assets/img/telehealth_circle.svg" /> ${item.formatted_name}</h2><div class="telehealth-contact">${translations.telehealthCardCaption}</div>${item_list_markup}</div>`;
  }

  writeProviderCard(item, closebox = false) {
    if ('telehealth_card' in item) {
      return this.writeTelehealthOnlyProviderCard(item); // no closebox necessary
    }
    let translations = this.translations;
    let telehealth = false;
    let telehealth_only = false;
    let pill = false;
    let pill_mail = false;
    let pill_pickup = false;
    let pill_generic = false;
    let procedure = false;
    item.known_offerings.map((offer) => {
      if (offer.indexOf("pill") > -1) {
        pill = true;
      }
      if (offer === "surgical_abortion") {
        procedure = true;
      }
      if (offer.indexOf("pill_visit") > -1) {
        pill_pickup = true;
      }
      if (offer.indexOf("pill_delivery") > -1) {
        pill_mail = true;
      }
      if (offer.indexOf("tele") > -1) {
        telehealth = true;
      }
    });
    pill_generic = pill && !pill_pickup && !pill_mail;
    if (telehealth && !procedure && !pill_pickup) {
      telehealth_only = true;
    }
    let closebox_markup = '';
    if (closebox) {
      closebox_markup = `<div class="provider-card-close">
      <button class="close-button" aria-label="Close button" type="button">
        <span aria-hidden="true">&nbsp;&times;&nbsp;</span>
      </button>
      </div>`;
    }

    let miles_away_str = translations.n_milesAway.replace("{N}",''+(Math.round(item.distanceInMiles*10)/10));

    return `<div class="provider-card-container">
    ${closebox_markup}
    ${item.distanceInMiles != undefined && !telehealth_only? `<div class="distance-indicator">${ miles_away_str }</div>` : ""}
    ${telehealth_only ? `<div class="provider-pill">${translations.telehealthOnly}</div>` : ""}
    <h2 class="h4">${item.formatted_name}</h2>
      <div class="services">
        <span class="services-list-label">${translations.servicesListLabel}</span>
        <ul class="services-list">
        ${
          telehealth
            ? `<li class="telehealth">
          <span class="service-icon">
            <img src="/assets/img/telehealth.svg" width="16px"/>
          </span>
          ${translations.telehealthLabel}
        </li>`
            : ""
        }
        ${
            pill_generic
              ? `<li>
            <span class="service-icon">
              <img src="/assets/img/pill.svg" width="16px"/>
            </span>
            ${translations.pillLabel}
          </li>`
              : ""
          }
          ${
            pill_pickup
              ? `<li>
            <span class="service-icon">
              <img src="/assets/img/pillpickup.svg" width="16px"/>
            </span>
            ${translations.pillLabel_pickup}
          </li>`
              : ""
          }
          ${
            pill_mail
              ? `<li>
            <span class="service-icon">
              <img src="/assets/img/pillmail.svg" width="16px"/>
            </span>
            ${translations.pillLabel_mail}
          </li>`
              : ""
          }
          ${
            procedure
              ? `<li>
            <span class="service-icon">
              <img src="/assets/img/procedure.svg" width="16px"/>
            </span>
            ${translations.procedureLabel}
          </li>`
              : ""
          }
        </ul>
      </div>
      <div class="provider-info">
        <div class="provider-address">
          <span class="provider-icon">
            <img src="/assets/img/location_v2.svg" width="28px" alt="${translations.addressAltText}"/>
          </span>
          <span class="provider-address-line"><a target="_blank" href="https://maps.google.com/?q=${
            item.full_address
          }">${item.full_address}</a></span>
        </div>
        <div class="provider-phone">
          <span class="provider-icon">
            <img src="/assets/img/phone_v2.svg" width="28px" alt="${translations.phoneNumberAltText}" />
          </span>
          <a href="tel:${item.formatted_phone}">${item.formatted_phone}</a>
        </div>
        <div class="provider-website">
          <span class="provider-icon">
            <img src="/assets/img/website_v2.svg" width="28px"/>
          </span>
          <a href="${
            item.formatted_url
          }" target="_blank" alt="">${translations.providerWebsiteAltText}</a>
          </div>
      </div>
    </div>`;
  }

  writeProviderList(list, translations) {
    return `${list
      .map((item) => {
        return `<li class="provider-card ${'telehealth_card' in item? 'telehealth-card' : ''}">${this.writeProviderCard(item)}</li>`;
      })
      .join("\n      ")}`;
  }

}


window.customElements.define(
  "cagov-abortion-provider-list",
  CaGovAbortionProviderList
);





function getDistanceBetweenPoints(lat1, lng1, lat2, lng2){
  // The radius of the planet earth in meters
  let R = 6378137;
  let dLat = degreesToRadians(lat2 - lat1);
  let dLong = degreesToRadians(lng2 - lng1);
  let a = Math.sin(dLat / 2)
          *
          Math.sin(dLat / 2) 
          +
          Math.cos(degreesToRadians(lat1)) 
          * 
          Math.cos(degreesToRadians(lat1)) 
          *
          Math.sin(dLong / 2) 
          * 
          Math.sin(dLong / 2);

  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;

  return distance;
}

function degreesToRadians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}