const fs = require("fs");

module.exports = function() {
  let providers = JSON.parse(
    fs.readFileSync("./src/assets/data/abortionfinder.json", "utf8")
  );

  let offeringsWeAreConcernedWith = [
    "abortion_telemedicine",
    "abortion_telehealth_pill_visit",
    "telehealth",
    "abortion_telehealth_pill_delivery",
    "medication_abortion_pill",
    "surgical_abortion",
  ];

  providers.clinics.forEach((p) => {
    delete p.id;
    delete p.abortion_pill_gestational_age_protected;
    delete p.abortion_procedure_gestational_age_protected;
    if (p.address_2 && p.address_2 != "" && p.address_2.indexOf(" ") < 0) {
      // console.log(p.address_2);
      if (p.address_2.indexOf("#") > -1 && p.address_2.indexOf("&") > -1) {
        p.full_address = p.full_address.replace(
          p.address_2,
          p.address_2.toUpperCase()
        );
      }
    }
    delete p.address_1;
    delete p.address_2;
    delete p.address_private;
    delete p.city;
    delete p.country;
    delete p.docasap_practice_id;
    delete p.is_whoops_proof;
    delete p.state;
    delete p.telemed_consultation_gestational_age_max;
    delete p.telemed_first_pill_gestational_age_max;
    delete p.updated_at;
    delete p.phone;
    delete p.website_note;
    delete p.zip;
    delete p.abortion_pill_gestational_age_max;
    delete p.abortion_procedure_gestational_age_max;
    delete p.name;
    delete p.url;
    delete p.formatted_zip;
    delete p.address_private_text_en;
    delete p.address_private_text_es;
    delete p.county_fips_code;
    delete p.other_languages;
    let known_offerings = [];
    p.known_offerings.forEach((o) => {
      if (offeringsWeAreConcernedWith.indexOf(o) > -1) {
        known_offerings.push(o);
      }
    });
    p.known_offerings = known_offerings;
  });

  if (!fs.existsSync('./_site/data')) {
    fs.mkdirSync('./_site/data');
  }
  fs.writeFileSync("./_site/data/abortionfinder.json", JSON.stringify(providers), "utf8");
}