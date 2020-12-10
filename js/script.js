
var clearAttr = function(target){
    d3.select(target).text("");
}

var mergeData = function(){
    var mergedData = []
    for(var i=0; i<arguments[0].length;i++){
        var tmpArray = []
        for(j=0; j<arguments.length;j++){
            tmpArray.push(arguments[j][i]);
        }
        mergedData.push(tmpArray);
    }
    return mergedData;
}

var width = 650;
var height = 350;
var projection = d3.geo.equirectangular()
    .scale(160*(height/480))
    .center([60,-20]);
var path = d3.geo.path()
    .projection(projection);
var svg = d3.select("#nobel-map")
    .append("svg")
    .attr("width",width)
    .attr("height",height);


var vizWorldMap = function(){
    // 世界地図の描画
    var worldmapURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/world-110m.json"
    d3.json(worldmapURL,function(error,world){
        if(error){
            console.log.warn(error);
        }
        var land = topojson.feature(world,world.objects.land)
        var countries = topojson.feature(world,world.objects.countries).features
        var borders = topojson.mesh(world,world.objects.countries,function(a,b){
            return a !== b;
        })

        // map表示
        svg.insert("path",".graticule")
            .datum(land)
            .attr("class","land")
            .attr("d",path);
        
        svg.insert("g",".graticule")
            .datum(countries)
            .attr("class","countries");
            
        svg.insert("g",".graticule")
            .datum(borders)
            .attr("class","boundary")
            .attr("d",path);
    });

    drawWorldCircle();
};


var drawWorldCircle = function(){
    // 地図に円をマッピング
    var winnersNumByCountriesURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/bycountry.csv"
    d3.csv(winnersNumByCountriesURL,function(error,data){
        if(error){
            console.log.warn(error);
        }
        var scale = d3.scale.linear()
            .domain([
                d3.min(data,function(d){ return d.winners; }),
                d3.max(data,function(d){ return d.winners; })
            ])
            .range([10,30]);
        
        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx",function(d){
                return projection([d.lon,d.lat])[0];
            })
            .attr("cy",function(d){
                return projection([d.lon,d.lat])[1]
            })
            .attr("r",function(d){
                return Math.sqrt(parseInt(scale(d.winners)));
            })
            .style("fill","yellow")
            .style("opacity",0.75)
            .on("mouseover",function(d){
                d3.select(this).style("fill","red");
                
                // このバーのx,yを取得し、ツールチップに使う
                var xpos = projection([d.lon,d.lat])[0];
                var ypos = projection([d.lon,d.lat])[1]-150;

                d3.select("#map-tooltip")
                    .style("left",xpos+"px")
                    .style("top",ypos+"px")
                    .select("#value")
                    .text(d.country+":"+d.winners);
                d3.select("#map-tooltip").classed("hidden",false);
            })
            .on("mouseout",function(d){
                d3.select(this)
                    .transition()
                    .duration(400)
                    .style("fill","yellow");
                // ツールチップを取り除く
                d3.select("#map-tooltip").classed("hidden",true);
            })
            .on("click",function(d){
                // クリックされた国の受賞者一覧を表示する
                var country = d.country;
                var winnersDataURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/nwinners.json";
                d3.json(winnersDataURL,function(error,winners){
                    // 照合結果からwinnersを更新
                    // matched = {{year:xxx,name:xxx,category:xxx}, ... , }という形にする
                    var matched = [];
                    var rows = ["year","name","category"];
                    Object.keys(winners.country).filter(key => {
                        if(winners.country[key] === country){
                            var data = {};
                            for(var attr of Object.keys(winners)){
                                if(!rows.includes(attr)){ continue; }
                                data[attr] = winners[attr][key];
                            }
                            matched.push(data);
                        }
                    });

                    // 以前のテーブル情報を削除
                    var table = d3.select("table");
                    table.select("thead").remove();

                    // テーブルの列名を列挙
                    var names = d3.keys(matched[0]);
                    table.append("thead")
                        .append("tr")
                        .selectAll("th")
                        .data(names)
                        .enter()
                        .append("th")
                        .text(function(d){ return d; });

                    // テーブルにアイテムを追加
                    var tbody = d3.select("tbody");
                    var i=0
                    tbody.text("")
                    tbody.selectAll("tr")
                        .data(matched)
                        .enter()
                        .append("tr")
                        .selectAll("td")
                        .data(function(row){ return d3.entries(row)})
                        .enter()
                        .append("td")
                        .attr("id",function(d){
                            if((i-2)%3 == 0){
                                i++;
                                return "name"
                            }
                            i++;
                            return ""
                        })
                        .text(function(d){return d.value;})
                        .on("click",function(d,i){
                            switch(i){
                            case 0:
                                // selected name
                                console.log(d);
                                var winnerID = Object.keys(winners.name).filter(function(k) {
                                    if(winners.name[k] == d.value)
                                        return k;
                                })[0];
                                var info = {};
                                for(var key of Object.keys(winners)){
                                    info[key] = winners[key][winnerID];
                                }
                                if(info.name){
                                    vizWinnerInfo(info);
                                    return;
                                }
                                break;
                            case 1:
                                // selected year
                                console.log(d);
                                break;
                            case 2:
                                // selected category
                                console.log(d);
                                vizByCategory(d.value);
                                break;
                            default:
                                break;
                            }
                            // クリック対象が時間
                        })// tbody click end
                });
                // end d3.json
            });
    });
};

var main = function(){
    vizWorldMap();
}();

var word = ""

var search = function(e){
    var name = document.getElementById("text").value;
    if(!name || name.trim().length == 0 || name.length < 3 || word == name) return;
    var query = '?query=name.str.contains("{}")'.format(name);
    word = name;
    d3.json($API + query ,function(error,data){
        var namelist = Object.values(data.name);
        if(namelist.length > 1){
            new Suggest.Local("text", "suggest",namelist, {dispAllKey: true});
        }
        if(namelist.length == 1){
            var info = {};
            var winnerID =  Object.keys(data.name)[0];
            for(var key of Object.keys(data)){
                info[key] = data[key][winnerID];
            }
            vizWinnerInfo(info);
        }
    });
}

var vizWinnerInfo = function(info){
    console.log(info);
    // 初期化
    clearAttr("#picbox");
    clearAttr("#infobox")
    clearAttr("#readmore");

    // picbox
    d3.select("#picbox")
        .append("img")
        .style("text-align","center")
        .attr("src",info.bio_image)
    
    // infoboxへの描画
    var infobox = [
        {"key":"name","value":info.name},
        {"key":"year","value":info.year},
        {"key":"category","value":info.category},
        {"key":"country","value":info.country}
    ]
    d3.select("#infobox")
        .selectAll("p")
        .data(infobox)
        .enter()
        .append("p")
        .text(function(d){
            return "{} : {}".format(d.key,d.value);
        })

    // readmore
    d3.select("#readmore")
        .append("a")
        .attr("href",info.link)
        .attr("target","_blank")
        .text("Read more at Wikipedia");
}