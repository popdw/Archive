#!/bin/bash
node generate_seeder_json.js
node seed_categories.js

for ((n=0;n<5;n++)); do
    node seed_elastic.js $1
done

#node seed_questions_to_ask.js
node seed_metadata.js
node seed_place_of_care.js
node seed_practitioner_of_care.js
node seed_provider.js
node seed_reviews.js
