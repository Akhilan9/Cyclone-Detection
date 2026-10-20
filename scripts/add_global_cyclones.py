import json
import os

FIXTURE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "fixtures", "sample_cyclones.json")

GLOBAL_CYCLONES = [
    {
        "cyclone_id": "2005236N23285",
        "name": "KATRINA",
        "season_year": 2005,
        "basin": "North Atlantic",
        "subbasin": "Gulf of Mexico",
        "nature": "Tropical",
        "max_wind_speed_kts": 150.0,
        "min_central_pressure_hpa": 902.0,
        "highest_imd_stage": "Super Cyclonic Storm (SuCS) / Cat 5 Hurricane",
        "saffir_simpson_category": "Category 5 Hurricane",
        "track_points": [
            {
                "timestamp_utc": "2005-08-23T18:00:00Z",
                "latitude": 23.1,
                "longitude": -75.1,
                "wind_speed_kts": 30.0,
                "central_pressure_hpa": 1008.0,
                "imd_stage": "Tropical Depression",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-24T12:00:00Z",
                "latitude": 24.5,
                "longitude": -76.5,
                "wind_speed_kts": 40.0,
                "central_pressure_hpa": 1006.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-25T18:00:00Z",
                "latitude": 26.0,
                "longitude": -79.9,
                "wind_speed_kts": 65.0,
                "central_pressure_hpa": 985.0,
                "imd_stage": "Category 1 Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-26T12:00:00Z",
                "latitude": 25.1,
                "longitude": -82.0,
                "wind_speed_kts": 75.0,
                "central_pressure_hpa": 979.0,
                "imd_stage": "Category 1 Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-27T12:00:00Z",
                "latitude": 24.4,
                "longitude": -84.7,
                "wind_speed_kts": 100.0,
                "central_pressure_hpa": 948.0,
                "imd_stage": "Category 3 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-28T12:00:00Z",
                "latitude": 25.7,
                "longitude": -87.7,
                "wind_speed_kts": 145.0,
                "central_pressure_hpa": 909.0,
                "imd_stage": "Category 5 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-28T18:00:00Z",
                "latitude": 26.5,
                "longitude": -88.6,
                "wind_speed_kts": 150.0,
                "central_pressure_hpa": 902.0,
                "imd_stage": "Category 5 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-29T11:00:00Z",
                "latitude": 29.3,
                "longitude": -89.6,
                "wind_speed_kts": 110.0,
                "central_pressure_hpa": 920.0,
                "imd_stage": "Category 3 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-29T18:00:00Z",
                "latitude": 31.1,
                "longitude": -89.6,
                "wind_speed_kts": 80.0,
                "central_pressure_hpa": 948.0,
                "imd_stage": "Category 1 Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2005-08-30T12:00:00Z",
                "latitude": 35.6,
                "longitude": -88.4,
                "wind_speed_kts": 30.0,
                "central_pressure_hpa": 990.0,
                "imd_stage": "Tropical Depression",
                "image_path": ""
            }
        ]
    },
    {
        "cyclone_id": "2022266N11308",
        "name": "IAN",
        "season_year": 2022,
        "basin": "North Atlantic",
        "subbasin": "Caribbean / Florida",
        "nature": "Tropical",
        "max_wind_speed_kts": 140.0,
        "min_central_pressure_hpa": 937.0,
        "highest_imd_stage": "Super Cyclonic Storm (SuCS) / Cat 5 Hurricane",
        "saffir_simpson_category": "Category 5 Hurricane",
        "track_points": [
            {
                "timestamp_utc": "2022-09-24T00:00:00Z",
                "latitude": 14.1,
                "longitude": -73.8,
                "wind_speed_kts": 35.0,
                "central_pressure_hpa": 1003.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-25T12:00:00Z",
                "latitude": 15.2,
                "longitude": -79.8,
                "wind_speed_kts": 45.0,
                "central_pressure_hpa": 1001.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-26T12:00:00Z",
                "latitude": 19.1,
                "longitude": -82.7,
                "wind_speed_kts": 70.0,
                "central_pressure_hpa": 981.0,
                "imd_stage": "Category 1 Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-27T08:00:00Z",
                "latitude": 22.3,
                "longitude": -83.7,
                "wind_speed_kts": 110.0,
                "central_pressure_hpa": 947.0,
                "imd_stage": "Category 3 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-28T06:00:00Z",
                "latitude": 25.4,
                "longitude": -82.9,
                "wind_speed_kts": 135.0,
                "central_pressure_hpa": 937.0,
                "imd_stage": "Category 4 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-28T12:00:00Z",
                "latitude": 26.2,
                "longitude": -82.6,
                "wind_speed_kts": 140.0,
                "central_pressure_hpa": 937.0,
                "imd_stage": "Category 5 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-28T19:00:00Z",
                "latitude": 26.7,
                "longitude": -82.2,
                "wind_speed_kts": 130.0,
                "central_pressure_hpa": 940.0,
                "imd_stage": "Category 4 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-29T12:00:00Z",
                "latitude": 28.5,
                "longitude": -80.8,
                "wind_speed_kts": 60.0,
                "central_pressure_hpa": 987.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2022-09-30T18:00:00Z",
                "latitude": 33.2,
                "longitude": -79.2,
                "wind_speed_kts": 75.0,
                "central_pressure_hpa": 977.0,
                "imd_stage": "Category 1 Hurricane",
                "image_path": ""
            }
        ]
    },
    {
        "cyclone_id": "2013307N06158",
        "name": "HAIYAN",
        "season_year": 2013,
        "basin": "Western Pacific",
        "subbasin": "Philippine Sea",
        "nature": "Tropical",
        "max_wind_speed_kts": 170.0,
        "min_central_pressure_hpa": 895.0,
        "highest_imd_stage": "Super Cyclonic Storm (SuCS) / Cat 5 Super Typhoon",
        "saffir_simpson_category": "Category 5 Super Typhoon",
        "track_points": [
            {
                "timestamp_utc": "2013-11-03T12:00:00Z",
                "latitude": 6.0,
                "longitude": 153.2,
                "wind_speed_kts": 35.0,
                "central_pressure_hpa": 1002.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-04T12:00:00Z",
                "latitude": 6.3,
                "longitude": 145.4,
                "wind_speed_kts": 55.0,
                "central_pressure_hpa": 990.0,
                "imd_stage": "Severe Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-05T12:00:00Z",
                "latitude": 7.1,
                "longitude": 138.8,
                "wind_speed_kts": 95.0,
                "central_pressure_hpa": 960.0,
                "imd_stage": "Category 2 Typhoon",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-06T12:00:00Z",
                "latitude": 7.9,
                "longitude": 132.8,
                "wind_speed_kts": 140.0,
                "central_pressure_hpa": 920.0,
                "imd_stage": "Category 5 Super Typhoon",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-07T18:00:00Z",
                "latitude": 10.4,
                "longitude": 126.9,
                "wind_speed_kts": 170.0,
                "central_pressure_hpa": 895.0,
                "imd_stage": "Category 5 Super Typhoon",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-08T00:00:00Z",
                "latitude": 11.0,
                "longitude": 125.0,
                "wind_speed_kts": 165.0,
                "central_pressure_hpa": 900.0,
                "imd_stage": "Category 5 Super Typhoon",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-08T12:00:00Z",
                "latitude": 11.9,
                "longitude": 121.2,
                "wind_speed_kts": 130.0,
                "central_pressure_hpa": 930.0,
                "imd_stage": "Category 4 Super Typhoon",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-09T12:00:00Z",
                "latitude": 14.5,
                "longitude": 114.7,
                "wind_speed_kts": 100.0,
                "central_pressure_hpa": 950.0,
                "imd_stage": "Category 3 Typhoon",
                "image_path": ""
            },
            {
                "timestamp_utc": "2013-11-10T21:00:00Z",
                "latitude": 21.0,
                "longitude": 107.5,
                "wind_speed_kts": 75.0,
                "central_pressure_hpa": 975.0,
                "imd_stage": "Category 1 Typhoon",
                "image_path": ""
            }
        ]
    },
    {
        "cyclone_id": "2015293N09266",
        "name": "PATRICIA",
        "season_year": 2015,
        "basin": "Eastern Pacific",
        "subbasin": "Northeast Pacific",
        "nature": "Tropical",
        "max_wind_speed_kts": 185.0,
        "min_central_pressure_hpa": 872.0,
        "highest_imd_stage": "Super Cyclonic Storm (SuCS) / Cat 5 Hurricane",
        "saffir_simpson_category": "Category 5 Hurricane",
        "track_points": [
            {
                "timestamp_utc": "2015-10-20T18:00:00Z",
                "latitude": 13.0,
                "longitude": -94.0,
                "wind_speed_kts": 30.0,
                "central_pressure_hpa": 1007.0,
                "imd_stage": "Tropical Depression",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-21T12:00:00Z",
                "latitude": 13.1,
                "longitude": -96.2,
                "wind_speed_kts": 40.0,
                "central_pressure_hpa": 1004.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-22T06:00:00Z",
                "latitude": 14.0,
                "longitude": -99.8,
                "wind_speed_kts": 60.0,
                "central_pressure_hpa": 994.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-22T18:00:00Z",
                "latitude": 15.0,
                "longitude": -102.6,
                "wind_speed_kts": 115.0,
                "central_pressure_hpa": 946.0,
                "imd_stage": "Category 4 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-23T06:00:00Z",
                "latitude": 16.5,
                "longitude": -104.7,
                "wind_speed_kts": 175.0,
                "central_pressure_hpa": 885.0,
                "imd_stage": "Category 5 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-23T12:00:00Z",
                "latitude": 17.3,
                "longitude": -105.1,
                "wind_speed_kts": 185.0,
                "central_pressure_hpa": 872.0,
                "imd_stage": "Category 5 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-23T23:00:00Z",
                "latitude": 19.4,
                "longitude": -105.0,
                "wind_speed_kts": 130.0,
                "central_pressure_hpa": 932.0,
                "imd_stage": "Category 4 Major Hurricane",
                "image_path": ""
            },
            {
                "timestamp_utc": "2015-10-24T12:00:00Z",
                "latitude": 23.5,
                "longitude": -102.5,
                "wind_speed_kts": 30.0,
                "central_pressure_hpa": 1002.0,
                "imd_stage": "Tropical Depression",
                "image_path": ""
            }
        ]
    },
    {
        "cyclone_id": "2023036S10114",
        "name": "FREDDY",
        "season_year": 2023,
        "basin": "Southern Hemisphere",
        "subbasin": "South Indian Ocean",
        "nature": "Tropical",
        "max_wind_speed_kts": 145.0,
        "min_central_pressure_hpa": 927.0,
        "highest_imd_stage": "Super Cyclonic Storm (SuCS) / Cat 5 Tropical Cyclone",
        "saffir_simpson_category": "Category 5 Tropical Cyclone",
        "track_points": [
            {
                "timestamp_utc": "2023-02-06T12:00:00Z",
                "latitude": -12.1,
                "longitude": 115.5,
                "wind_speed_kts": 35.0,
                "central_pressure_hpa": 998.0,
                "imd_stage": "Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-02-11T12:00:00Z",
                "latitude": -15.4,
                "longitude": 91.2,
                "wind_speed_kts": 90.0,
                "central_pressure_hpa": 960.0,
                "imd_stage": "Category 2 Tropical Cyclone",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-02-15T12:00:00Z",
                "latitude": -15.8,
                "longitude": 80.4,
                "wind_speed_kts": 135.0,
                "central_pressure_hpa": 935.0,
                "imd_stage": "Category 4 Tropical Cyclone",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-02-19T12:00:00Z",
                "latitude": -16.8,
                "longitude": 60.1,
                "wind_speed_kts": 145.0,
                "central_pressure_hpa": 927.0,
                "imd_stage": "Category 5 Tropical Cyclone",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-02-21T18:00:00Z",
                "latitude": -20.2,
                "longitude": 48.5,
                "wind_speed_kts": 95.0,
                "central_pressure_hpa": 965.0,
                "imd_stage": "Category 2 Tropical Cyclone",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-02-24T12:00:00Z",
                "latitude": -22.1,
                "longitude": 35.5,
                "wind_speed_kts": 60.0,
                "central_pressure_hpa": 988.0,
                "imd_stage": "Severe Tropical Storm",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-03-05T12:00:00Z",
                "latitude": -21.4,
                "longitude": 40.5,
                "wind_speed_kts": 65.0,
                "central_pressure_hpa": 985.0,
                "imd_stage": "Category 1 Tropical Cyclone",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-03-10T12:00:00Z",
                "latitude": -18.2,
                "longitude": 38.0,
                "wind_speed_kts": 110.0,
                "central_pressure_hpa": 950.0,
                "imd_stage": "Category 3 Major Cyclone",
                "image_path": ""
            },
            {
                "timestamp_utc": "2023-03-11T18:00:00Z",
                "latitude": -17.8,
                "longitude": 36.9,
                "wind_speed_kts": 85.0,
                "central_pressure_hpa": 968.0,
                "imd_stage": "Category 2 Tropical Cyclone",
                "image_path": ""
            }
        ]
    }
]

with open(FIXTURE_PATH, "r") as f:
    data = json.load(f)

existing_ids = {c["cyclone_id"] for c in data.get("cyclones", [])}
added = 0
for g in GLOBAL_CYCLONES:
    if g["cyclone_id"] not in existing_ids:
        data["cyclones"].append(g)
        added += 1
        print(f"Added global cyclone: {g['name']} ({g['basin']}, {g['season_year']})")

data["description"] = "Verified global and North Indian Ocean tropical cyclone benchmark dataset (NOAA IBTrACS & IMD RSMC)."

with open(FIXTURE_PATH, "w") as f:
    json.dump(data, f, indent=2)

print(f"Successfully updated fixture! Total cyclones now: {len(data['cyclones'])} (Added {added})")
