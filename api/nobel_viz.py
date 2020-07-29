from flask import Flask,request,abort,render_template_string
from flask_cors import CORS
from bson.json_util import dumps,default
import pandas as pd
import json

app = Flask(__name__)
CORS(app)

df = pd.read_json("../data/nwinners.json")

@app.route("/api")
def api():
    query = request.args.get("query")
    print(query)
    response = None
    if query :
        response = df.query(query)
    else :
        response = df
    return response.to_json()
    
@app.route("/api/country")
def getwinner_per_country():
    wpc = df.groupby("country").size().sort_values(ascending=False)
    return wpc.to_json()


@app.route("/api/category")
def getwinner_per_category():
    categories = [
        "Chemistry","Physics","Economics","Literature",
        "Physiology or Medicine","Peace"
    ]

    ret = {}
    for cat in categories :
        tmpdf = df[df.category == cat]
        ret[cat] = len(tmpdf)
    return ret
    
@app.route("/api/us")
def getus_country():
    query = request.args.get("query")
    if query == "world":
        with open("../data/world-110m.json") as f:
            udf = json.load(f)
        return json.dumps(udf)
    elif query == "countries":
        udf = pd.read_csv("../data/bycountry.csv")
        return udf.to_csv()
    elif query == "states":
        with open("../data/us-states.json") as f:
            udf = json.load(f)
        return json.dumps(udf)
    elif query == "productivity":
        udf = pd.read_csv("../data/us-ag-productivity.csv")
        return udf.to_csv()
    elif query == "cities":
        udf = pd.read_csv("../data/us-cities.csv")
        return udf.to_csv()
    

if __name__ == "__main__":
    app.run(port=8000,debug=True)