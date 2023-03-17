# abortion.ca.gov

## Design

<a href="https://www.figma.com/file/rpo4uIWOXuqEhJ9I5E9Co1/screens---abortion.ca.gov?node-id=103%3A3055">figma project</a>

## Data

We have an agreement to use data curated by abortionfinder.org. They have API documentation at <a href="https://www.bedsider.org/api/docs/#!/clinics/getApiClinicsV4">https://www.bedsider.org/api/docs/#!/clinics/getApiClinicsV4</a>

A one time pull of the dataset using this call:

https://www.bedsider.org/api/docs/#!/clinics/getApiClinicsV4?per_page=200&with_offerings=abortion_services&state=ca

has been stored in ./src/assets/data/abortionfinder.json

## Map

We have used [Leaflet](https://leafletjs.com/) for the map on this site. The prototype weighted in at 877kB total resources for the full page including all site nav, page content, JavaScript, CSS and map tiles. In comparison a prototype developed using ArcGIS weighed 22MB for similar functionality and did not include the surrounding site code.

### Map tiles

We have reduced external network calls by hosting our own map tiles. This should alleviate a lot of concerns CDPH has about security, scalability, handoff complexity.

## Site structure

This site uses ODI patterns of:

- 11ty static site generation based on markdown files in the repo just like https://designsystem.webstandards.ca.gov/
- The 11ty build is mainly based on the @cagov/11ty-build-system package

## Tests

Site tests are run with playwright which can use multiple browser engines and viewport sizes to review page functionality.

The ```npm test``` command will run the small end to end test set.

The main set of tests runs through site urls and reviews them for critical accessibility violations the axe engine can detect. This is not a full accessibility certification but can discover a lot of HTML structure issues that would cause problems for screen readers.

This test script can be run manually and is also configured to run in the git workflows that build the production site, PR preview sites and also on checkin via a git hook. The git hook is checked in from the ```git-hooks``` directory and is configured to be found with an npm ```preinstall``` command found in the package.json. This will run anytime ```npm install``` runs so each developer gets the git-hooks directory set to their executable .git/hooks location for this repository.


## Translations

The translated strings are managed using:
- Separate directories for each language containing page bodies
  - Each of these directories includes its own json file defining the locale and text direction so those values don't have to be in each page content file
  - The English content is not in a subdirectory so its locale and text direction are defined in the 11ty front matter
  - This file structure results in urls of / for english and /es/ for the corresponding Spanish translated homepage
- Strings used in template includes are managed by ```eleventy-plugin-i18n```. See <a href="https://github.com/adamduncan/eleventy-plugin-i18n">the docs</a> for more info.
  - The .eleventy.js pulls translated values in from ```pages/_data/i18n.js```
