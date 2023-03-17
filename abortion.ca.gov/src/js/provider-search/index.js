// is a web component so can instantiate self
// gets the data
// sets up map
// finds all lists on page
// populates any list with start param
export class CaGovAbortionProviderLookup extends window.HTMLElement {
  connectedCallback() {
    var input = document.getElementById("cityinput");
    // this is doubling the feedback on Awesomeplete
    // new Awesomplete(input, {
    //   minChars: 1,
    //   filter: Awesomplete.FILTER_STARTSWITH
    // });
   

    let translationKeys = ["searchAgainLabel"];
    this.searchAgainLabel = "Search again";
    // The map component is written into the page dynamically so custom element isn't in an 11ty HTML file, hence using document. instead of this. to get the translated values here
    translationKeys.forEach((key) => {
      if (document.querySelector(`[data-name="${key}"]`)) {
        this[key] = document.querySelector(`[data-name="${key}"]`).innerHTML;
      }
    });
    // get the set of providers
    fetch("/data/abortionfinder.json", {})
      .then((response) => response.json())
      .then((data) => {
        // give the map the list of providers
        this.data = data.clinics;
        this.data.forEach((rec, idx) => { rec.rec_id = idx;});
        this.dispatchEvent(new Event("gotProviderData"));
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    // get all cities, keep track of them in a map object
    let cityMap = new Map();
    fetch("/data/cities.json", {})
      .then((response) => response.json())
      .then((data) => {
        data.forEach((item) => {
          cityMap.set(item.city.toLowerCase(), item);
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    var searchAllFlag = false;
    document
      .querySelector("#citylookup")
      .addEventListener("submit", (event) => {
        event.preventDefault();

        document.querySelector("#provider-search-error").style.display = "none";
        document.querySelector("input#cityinput").classList.remove("error_state");

        if (this.querySelector(".cagov-map-and-tiles").innerHTML == "") {
          this.querySelector(
            ".cagov-map-and-tiles"
          ).innerHTML = `<cagov-abortion-provider-map></cagov-abortion-provider-map>
            <cagov-abortion-provider-list data-listen="cagov-abortion-provider-lookup"></cagov-abortion-provider-list>`;
        }
        let queryString = document
          .querySelector("#citylookup")
          .querySelector("input").value;

        if (searchAllFlag) {
          // console.log("SEARCH ALL");
          searchAllFlag = false;
          this.currentCity = "";
          this.dispatchEvent(new Event("newCity"));
        } else {
          const foundZip = queryString.match(/^(?<zipcode>9\d\d\d\d).*/); // will cut off 13-digit zips to first 5
          if (foundZip) {
            // console.log("Got zipcode",foundZip.groups.zipcode);
            var zipError = false;
            var zipRecord = undefined;
            fetch("https://abortion.ca.gov/service-api/location/city-zip/"+foundZip.groups.zipcode, {})
            .then((response) => response.json())
            .then((data) => {
              if (data.length >= 1) {
                zipRecord = data[0];
                // console.log("Got result",zipRecord);
                document.querySelector("#search-county").innerHTML = this.searchAgainLabel;
                this.currentCity = zipRecord;
                this.dispatchEvent(new Event("newCity"));
              } else {
              // deal with it...
                // console.log("Likely zip search error");
                document.querySelector("#provider-search-error").style.display = "block";
                document.querySelector("input#cityinput").classList.add("error_state");
                zipError = true;
              }
            })
            .catch((error) => {
              console.log("Error:", error);
              zipError = true;
              // deal with it...
            });
          } else {
            // console.log("Did not get zipcode");
            let currentCity = cityMap.get(queryString.toLowerCase());
            if (currentCity == undefined) {
              document.querySelector("#provider-search-error").style.display = "block";
              document.querySelector("input#cityinput").classList.add("error_state");
            }
            else {
              if (currentCity != "") {
                // retitle search button
                document.querySelector("#search-county").innerHTML =
                  this.searchAgainLabel;
              } else {
                console.log("Likely failed search");
              }
              this.currentCity = currentCity;
              // console.log("Set currentCity to",currentCity);

              this.dispatchEvent(new Event("newCity"));
            }
          }
        }
      });

    document.querySelector("#search-all").addEventListener("click", (event) => {
      searchAllFlag = true;
    });
  }
}
window.customElements.define(
  "cagov-abortion-provider-lookup",
  CaGovAbortionProviderLookup
);
