
var vizUSAMap = function(){
    d3.json($API+"/us?query=states",function(error,states){
        if(error){
            console.log.warn(error);
        }
        var width = 650;
        var height = 350;
        var projection = d3.geo.albersUsa()
            .translate([width/2,height/2])
            .scale([500]);
        var path = d3.geo.path()
            .projection(projection);
        
        // データを受け取り、色を返すスケール
        // domainはあとで、データによってきめる
        var color = d3.scale.quantize()
            .range(["rgb(237,248,233)","rgb(186,228,179)",
            "rgb(116,196,118)","rgb(49,163,84)","rgb(0,109,44)"]);

        var svg = d3.select("#nobel-map")
            .append("svg")
            .attr("width",width)
            .attr("height",height);
        



        //for usa
        d3.csv($API+"/us?query=productivity",function(error,data){
            if(error){
                console.log.warn(error);
            }

            // colorスケールのドメインを設定
            color.domain([
                d3.min(data,function(d){ return d.value; }),
                d3.max(data,function(d){ return d.value; })
            ]);

            for(var i=0;i<data.length; i++){
                var dataState = data[i].state;
                var dataValue = parseFloat(data[i].value);

                // GeoJSONのなかの対応する州を見つける
                for(var j=0;j < states.features.length;j++){
                    var jsonState = states.features[j].properties.name;
                    if(dataState == jsonState){
                        states.features[j].properties.value = dataValue;
                        break;
                    }
                }
            }

            // map表示
            svg.selectAll("path")
                .data(states.features)
                .enter()
                .append("path")
                .attr("d",path)
                .style("fill", function(d){
                    var value = d.properties.value;
                    if(value){
                        return color(value);
                    }
                    else {
                        return "#ccc";
                    }
                });
        });

        d3.csv($API+"/us?query=cities",function(error,data){
            if(error){
                console.log.warn(error);
            }
            svg.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx",function(d){
                    return projection([d.lon,d.lat])[0];
                })
                .attr("cy",function(d){
                    return projection([d.lon,d.lat])[1];
                })
                .attr("r",function(d){
                    return Math.sqrt(parseInt(d.population)*0.00004);
                })
                .style("fill","yellow")
                .style("opacity",0.75);
        });
    });
};