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
    return new Promise(function(resolve,reject){
        // 世界地図の描画
        var worldmapURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/world-110m.json"
        d3.json(worldmapURL,function(error,world){
            if(error){
                reject(error);
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
            resolve(1);
        });
    });
};

var displayWinners = function(country){
    var winnersDataURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/nwinners.json";
    d3.json(winnersDataURL,function(error,winners){
        // 照合結果からwinnersを更新
        // matched = {{year:xxx,name:xxx,category:xxx}, ... , }という形にする
        var matched = [];
        var winnerID = 0;
        Object.keys(winners.country).filter(key => {
            if(winners.country[key] === country){
                var data = {};
                for(var attr of Object.keys(winners)){
                    data[attr] = winners[attr][key];
                }
                data.id = winnerID;
                winnerID++;
                matched.push(data);
            }
        });

        // 以前のテーブル情報を削除
        var table = d3.select("table");
        table.select("thead").remove();
        // テーブルの列名を列挙
        var rows = ["name","year","category"];
        table.append("thead")
            .append("tr")
            .selectAll("th")
            .data(rows)
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
            .data(function(row){
                // 各項目に受賞者IDを追加して,追跡できるようにしておく
                var entries = d3.entries(row);
                entries.forEach(element => {
                    element.id = row.id;
                });
                return entries
            })
            .enter()
            .append("td")
            .text(function(d){
                // 表の項目(rows)に該当する値だけを抽出
                if(rows.includes(d.key)){
                    return d.value;
                }
            })
            .on("click",function(d,i){
                // 名前がクリックされた
                if(i==0){
                    vizWinnerInfo(matched[d.id]);
                }
            })
    });
}

var drawWorldCircle = function(){
    // 地図に円をマッピング
    var winnersNumByCountriesURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/bycountry.csv"
    d3.csv(winnersNumByCountriesURL,function(error,data){
        if(error){
            console.warn(error);
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
                // このバーのx,yを取得し、ツールチップに使う
                d3.select(this).style("fill","red");
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
                displayWinners(d.country);
            });
    });
};

var main = function(){
    vizWorldMap()
        .then(_ => drawWorldCircle())
        .catch(error => console.warn(error));
    vizNobelBar();
}();

var vizWinnerInfo = function(info){
    // 初期化
    d3.select("#picbox").text("");
    d3.select("#infobox").text("");
    d3.select("#readmore").text("");
    // picbox
    d3.select("#picbox")
        .append("img")
        .style("text-align","center")
        .attr("src",info.bio_image)
    
    // infoboxへの描画
    var keys = ["name","year","category","country","date_of_birth","date_of_death"]
    d3.select("#infobox")
        .selectAll("p")
        .data(d3.entries(info))
        .enter()
        .append("p")
        .text(function(d){
            if(keys.includes(d.key)){
                return "{} : {}".format(d.key,d.value);
            }
        })
    // readmore
    d3.select("#readmore")
        .append("a")
        .attr("href",info.link)
        .attr("target","_blank")
        .text("Read more at Wikipedia");
}