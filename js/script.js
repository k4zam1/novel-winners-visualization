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
        var worldmapURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/world-110m.json";
        d3.json(worldmapURL,function(error,world){
            if(error){
                reject(error);
            }
            var land = topojson.feature(world,world.objects.land);
            var countries = topojson.feature(world,world.objects.countries).features;
            var borders = topojson.mesh(world,world.objects.countries,function(a,b){
                return a !== b;
            });
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


var findFromAssociativeArrays = function(assocArray,targetProperty,targetKey,addID=true){
    // [
    //  性質1 {0:aa,1:bb,2:cc},
    //  性質2 {0:dd,1:ee,2:ee}, ... ]
    // のような連想配列の配列
    // (例えば各性質(targetProperty)の0番目を取れば,0番目の人のデータが抽出できる)
    // ここから特定の性質について条件を満たす人のデータを抽出する
    // [Ex]. targetProperty == 性質2,targetKey == eeなら
    // -> [{1:bb,2:ee,id:0},{2:cc,2:ee,id:1}]
    var matched = [];
    var itemID = 0;
    Object.keys(assocArray[targetProperty]).filter(id => {
        // 性質targetPropertyでtargetKeyになる要素のid発見
        if(assocArray[targetProperty][id] === targetKey){
            var tmp = {};
            // すべての性質についてkey番目について取り出す
            for(var attr of Object.keys(assocArray)){
                tmp[attr] = assocArray[attr][id];
            }
            if(addID){
                tmp.id = itemID++;
            }
            matched.push(tmp);
        }
    });
    return matched;
}

var displayWinners = function(country){
    var winnersDataURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/data/nwinners.json";
    d3.json(winnersDataURL,function(error,winners){
        // matched = {{year:xxx,name:xxx,category:xxx}, ... , }という形にする
        var matched = findFromAssociativeArrays(winners,"country",country);
        var table = d3.select("table");
        // 以前のテーブル情報を削除
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
            });
    });
}


class Tooltip{
    /*
    以下のようなコードを追加しておく
    <div id="tooltipSelector" class="hidden">
        <p><strong>Title</strong></p>
        <p><span id="value">  text!  </span></p>
    </div>
    ・hiddenクラスを取り除くことで表示・非表示を切り替えられるようにCSSを追加する
    */
    constructor(tooltipSelector){
        this.tooltipSelector = tooltipSelector;
    }
    show(x,y,text){
        d3.select(this.tooltipSelector)
            .style("left",x +"px")
            .style("top", y +"px")
            .select("#value")
            .text(text);
        d3.select(this.tooltipSelector).classed("hidden",false);
    }
    hidden(){
        d3.select(this.tooltipSelector).classed("hidden",true);
    }
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
        var tooltip = new Tooltip("#map-tooltip");

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
                tooltip.show(xpos,ypos,d.country+":"+d.winners);
            })
            .on("mouseout",function(d){
                d3.select(this)
                    .transition()
                    .duration(400)
                    .style("fill","yellow");
                tooltip.hidden();
            })
            .on("click",function(d){
                // クリックされた国の受賞者一覧を表示する
                displayWinners(d.country);
            });
    });
};

var vizWinnerInfo = function(info){
    // 初期化
    var selectors = ["#picbox","#infobox","#readmore"];
    d3.select(...selectors).text("");

    // picbox
    d3.select("#picbox")
        .append("img")
        .style("text-align","center")
        .attr("src",info.bio_image);
    
    // infoboxへの描画
    var keys = ["name","year","category","country","date_of_birth","date_of_death"];
    d3.select("#infobox")
        .selectAll("p")
        .data(d3.entries(info))
        .enter()
        .append("p")
        .text(function(d){
            if(keys.includes(d.key)){
                return "{} : {}".format(d.key,d.value);
            }
        });
    // readmore
    d3.select("#readmore")
        .append("a")
        .attr("href",info.link)
        .attr("target","_blank")
        .text("Read more at Wikipedia");
}



class BarAxis {
    constructor(selector,width,height,xlabel,ylabel,yoffset=10,xoffset=30){
        this.selector = selector;
        this.width = width;
        this.height = height;
        this.xlabel = xlabel;
        this.ylabel = ylabel;
        this.yoffset = 10;
        this.xoffset = 30;
        this.svg = d3.select(selector)
            .append("svg")
            .attr("width",width)
            .attr("height",height);
        this.xScale = d3.scale.ordinal()
            .domain(d3.range(xlabel.length))
            .rangeRoundBands([0,width]);
        this.xAxis = d3.svg.axis()
            .scale(this.xScale)
            .orient("bottom")
            .tickFormat(function(d){ return xlabel[d]; });
        this.yScale = d3.scale.linear()
            .domain([Math.min(...ylabel),Math.max(...ylabel)+yoffset+10])
            .range([height-this.yoffset,0]);
        this.yAxis = d3.svg.axis()
            .scale(this.yScale)
            .orient("left");
    }
    showAxis(){
        this.svg.append("g")
            .attr("class","xaxis")
            .attr("transform","translate("+this.xoffset+","+this.height+")")
            .call(this.xAxis)
            .selectAll("text")
            .style("text-anchor", "start");
        
        this.svg.append("g")
            .attr("class","yaxis")
            .attr("transform","translate("+this.xoffset+","+10+")")
            .call(this.yAxis);
        return this.svg;
    }
}

class BarRectangle {
    constructor(canvas,axis,bar_width=10,bar_color="#6699CC"){
        this.canvas = canvas;
        this.axis = axis;
        this.bar_width = bar_width;
        this.bar_color = bar_color;
    }
    showBar(axis){
        var rects = axis.svg.selectAll("rect")
            .data(axis.ylabel)
            .enter()
            .append("rect")
            .attr("x",function(d,i){
                return axis.xScale(i) + axis.xoffset;
            })
            .attr("y",function(d){
                return axis.yScale(d);
            })
            .attr("width",this.bar_width)
            .attr("height",function(d,i){
                return axis.yScale(0)-axis.yScale(d)+10;
            })
            .attr("fill",this.bar_color);
        return rects;
    }
}

var vizNobelBar = function(){
    var vizBarURL = "https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/api/bycountry.json";
    d3.json(vizBarURL,function(error,data){
        if(error){
            console.warn(error);
        }
        // 軸の表示
        var width = 640;
        var height = 240;
        var xlabel = Object.keys(data);
        var ylabel = Object.values(data);
        var axis = new BarAxis("#nobel-bar",width,height,xlabel,ylabel);
        var canvas = axis.showAxis();
        // グラフの生成
        var bar = new BarRectangle(canvas,axis);
        var rects = bar.showBar(axis);
        // グラフイベントの作成
        var barTooltip = new Tooltip("#tooltip");
        rects.on("mouseover",function(d,i){
                d3.select(this).attr("fill","orange");
                var xpos = parseFloat(d3.select(this).attr("x")) + axis.xScale.rangeBand()/2;
                var ypos = parseFloat(d3.select(this).attr("y")) + axis.height;
                barTooltip.show(xpos,ypos,xlabel[i]+":"+d)
            })
            .on("mouseout",function(){
                d3.select(this)
                    .transition()
                    .duration(400)
                    .attr("fill",bar.bar_color);
                
                barTooltip.hidden();
            });
    });
};


var main = function(){
    vizWorldMap()
        .then(_ => drawWorldCircle())
        .catch(error => console.warn(error));
    vizNobelBar();
}();