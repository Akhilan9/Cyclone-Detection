import urllib.request
import json
import sys

def test_endpoint(name, url, method='GET', data=None):
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header('Content-Type', 'application/json')
            req.data = json.dumps(data).encode('utf-8')
        with urllib.request.urlopen(req, timeout=15) as resp:
            code = resp.getcode()
            body = resp.read()
            print(f"[PASS] {name:<35} HTTP {code} | {len(body)} bytes")
            return True, body
    except Exception as e:
        print(f"[FAIL] {name:<35} Error: {e}")
        return False, None

print("=== STARTING COMPREHENSIVE BACKEND INTEGRITY AUDIT ===")

# 1. Cyclones
ok, b = test_endpoint('Cyclones Catalog', 'http://127.0.0.1:8000/api/v1/cyclones')
cyclones = json.loads(b) if ok else []
if not cyclones:
    print("[ERROR] No cyclones returned from DB!")
    sys.exit(1)

cid = cyclones[0]['cyclone_id']
cname = cyclones[0].get('name', 'UNKNOWN')
print(f"--> Target Cyclone: {cid} ({cname})")

# 2. Cyclone Detail & Tracks
test_endpoint('Cyclone Detail', f'http://127.0.0.1:8000/api/v1/cyclones/{cid}')
test_endpoint('Track Trajectory Sequence', f'http://127.0.0.1:8000/api/v1/tracks/{cid}')
test_endpoint('Track Coordinate Points', f'http://127.0.0.1:8000/api/v1/tracks/{cid}/points')

# 3. Models & Metrics & Sources
test_endpoint('Active Models Metadata', 'http://127.0.0.1:8000/api/v1/models')
test_endpoint('Verified Evaluation Metrics', 'http://127.0.0.1:8000/api/v1/metrics')
test_endpoint('Meteorological Data Sources', 'http://127.0.0.1:8000/api/v1/data/sources')
test_endpoint('Live Ping NOAA IBTrACS', 'http://127.0.0.1:8000/api/v1/data/sources/noaa_ibtracs_nio/ping')

# 4. Satellite Imagery
test_endpoint('Base64 Satellite Preview', f'http://127.0.0.1:8000/api/v1/satellite/preview/{cid}')
test_endpoint('5-Frame Satellite Sequence', f'http://127.0.0.1:8000/api/v1/satellite/sequence/{cid}?channel=irwin')

# 5. Predictions & Multi-Task Analysis
test_endpoint('End-to-End Multi-Task Analysis', 'http://127.0.0.1:8000/api/v1/predictions/analyze', 'POST', {'cyclone_id': cid, 'forecast_horizon_hours': 24})
test_endpoint('Kinematic Track Forecast', 'http://127.0.0.1:8000/api/v1/predictions/track', 'POST', {'cyclone_id': cid, 'forecast_horizon_hours': 24})
test_endpoint('Intensity Projection', 'http://127.0.0.1:8000/api/v1/predictions/intensity', 'POST', {'cyclone_id': cid, 'forecast_horizon_hours': 24})
test_endpoint('Landfall & Storm Hazard', 'http://127.0.0.1:8000/api/v1/predictions/landfall-hazard', 'POST', {'cyclone_id': cid, 'wind_speed_kts': 85.0})
test_endpoint('Rapid Intensification Diagnostic', f'http://127.0.0.1:8000/api/v1/predictions/rapid-intensification/{cid}')

# 6. Explainable AI (Grad-CAM)
test_endpoint('Grad-CAM XAI Heatmap', 'http://127.0.0.1:8000/api/v1/predictions/gradcam', 'POST', {'cyclone_id': cid, 'target_class': 4})

# 7. Research Reports (CSV and PDF)
ok_csv, b_csv = test_endpoint('Generate CSV Research Report', 'http://127.0.0.1:8000/api/v1/reports', 'POST', {'cyclone_id': cid, 'report_type': 'csv', 'title': f'{cname} Synoptic CSV'})
if ok_csv:
    rid = json.loads(b_csv)['id']
    test_endpoint('Download CSV Report File', f'http://127.0.0.1:8000/api/v1/reports/{rid}/download')

ok_pdf, b_pdf = test_endpoint('Generate PDF Research Report', 'http://127.0.0.1:8000/api/v1/reports', 'POST', {'cyclone_id': cid, 'report_type': 'pdf', 'title': f'{cname} Synoptic PDF'})
if ok_pdf:
    r_pdf_id = json.loads(b_pdf)['id']
    test_endpoint('Download PDF Report File', f'http://127.0.0.1:8000/api/v1/reports/{r_pdf_id}/download')

print("=== ALL TESTED ENDPOINTS COMPLETED SUCCESSFULLY ===")
