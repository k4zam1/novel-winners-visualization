
var vizNobelBar = function(){
    d3.json("https://raw.githubusercontent.com/k4zam1/novel-winners-visualization/master/api/bycountry.json",function(error,data){
        if(error){
            console.log.warn(error);
        }
        delete data[""]
        
        var xlabel = Object.keys(data);
        var ylabel = Object.values(data);
        var width = 640;
        var height = 240;
        var bar_width = 10;
        var xoffset = 30;

        var svg = d3.select("#nobel-bar")
            .append("svg")
            .attr("width",width)
            .attr("height",height);

        var xScale = d3.scale.ordinal()
            .domain(d3.range(xlabel.length))
            .rangeRoundBands([0,width-6],0.05);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .tickFormat(function(d){ return xlabel[d]; });

        var yScale = d3.scale.linear()
            .domain([Math.min(...ylabel),Math.max(...ylabel)])
            .range([200,10]);
            
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");

        
        var barcolor = "#6699CC";

        // グラフの生成
        svg.selectAll("rect")
            .data(ylabel)
            .enter()
            .append("rect")
            .attr("x",function(d,i){
                return xScale(i)+xoffset;
            })
            .attr("y",function(d){
                return yScale(d);
            })
            .attr("width",bar_width)
            .attr("height",function(d,i){
                return yScale(0)-yScale(d) + bar_width;
            })
            .attr("fill",barcolor)
            .on("mouseover",function(d,i){
                d3.select(this).attr("fill","orange");

                // このバーのx,yを取得し、ツールチップに使う
                var xpos = parseFloat(d3.select(this).attr("x")) + xScale.rangeBand()/2;
                var ypos = parseFloat(d3.select(this).attr("y")) + height;
                d3.select("#tooltip")
                    .style("left",xpos+"px")
                    .style("top",ypos+"px")
                    .select("#value")
                    .text(xlabel[i]+":"+d);
                d3.select("#tooltip").classed("hidden",false);
            })
            .on("mouseout",function(){
                d3.select(this)
                    .transition()
                    .duration(400)
                    .attr("fill",barcolor)
                
                // ツールチップを取り除く
                d3.select("#tooltip").classed("hidden",true);
            });

        // 軸の表示
        svg.append("g")
            .attr("class","xaxis")
            .attr("transform","translate("+xoffset+","+(height-30)+")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "start");
        
        svg.append("g")
            .attr("class","yaxis")
            .attr("transform","translate("+xoffset+","+10+")")
            .call(yAxis);
    });
};