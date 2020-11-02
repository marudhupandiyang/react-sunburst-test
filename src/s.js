// https://observablehq.com/@vevagm/untitled@398
export default function define(runtime, observer) {
  const main = runtime.module();

  const fileAttachments = new Map([
    ["flare.json", "/flare.json"]
  ]);
  //const fileAttachments = new Map([["flare@1.json",new URL("./files/1d04637f576319778c1730327216dc92142b89de46fc8192578c711ef8d68bcefa5f430bda06ca978c99f794f9f58b0cd1fa22bb19dd298f63d76751ca5149fe",import.meta.url)]]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer())
    .define(["md"], function(md) {
      return (
        md `# Zoomable Sunburst COVID-19`
      )
    });
  main.variable(observer("chart"))
    .define("chart", ["partition", "data", "d3", "width", "color", "arc", "radius"], function(partition, data, d3, width, color, arc, radius) {
      const root = partition(data);

      root.each(d => d.current = d);

      const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, width])
        .style("font", "80px sans-serif");

      const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${width / 2})`);

      const path = g.append("g")
        .selectAll("path")
        .data(root.descendants()
          .slice(1))
        .join("path")
        .attr('data-id', d => d.current.data.id)
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("d", d => arc(d.current))
        .on("mouseover", function(d) {
          if (!d.children) { return tooltip.style("visibility", "visible")
              .text(d.data.name)
              .style("display", "block"); }
        })
        .on("mousemove", function() {
          return tooltip.style("top",
              (d3.event.pageY - 40) + "px")
            .style("left", (d3.event.pageX + 20) + "px");
        })
        .on("mouseout", function() { return tooltip.style("visibility", "hidden"); });

      path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

      //path.append("title").text(d => `${d.ancestors().map(d => d.data.name).reverse().join(" -> ")}`.replace("flare -> ",""));

      const label = g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        //.attr("class", "wrap")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants()
          .slice(1))
        .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .attr('data-id', d => d.current.data.id)
        .attr('has-children', d => !!(d.children || d._children))
        .attr("width", d => {
          var p = svg.select("path[data-id='" + d.current.data.id + "']");
        })
        //.text(d => d.data.name)
        .text(d => d.data.name != undefined && d.data.name.length < 20 ? d.data.name : d.data.short);




      const parent = g.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

      const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .style("background-color", "black")
        .style("opacity", 0.5)
        .style("color", "white")
        .style("font-size", "12px")
        .style("padding", "15px")
        .style("width", "300px")
        .style("display", "none")
        .attr("class", "tooltip")
        .text("");

      function clicked(p) {
        parent.datum(p.parent || root);

        root.each(d => d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        });

        const t = g.transition()
          .duration(750);

        // Transition the data on all arcs, even the ones that aren’t visible,
        // so that if this transition is interrupted, entering arcs will start
        // the next transition from the desired position.
        path.transition(t)
          .tween("data", d => {
            const i = d3.interpolate(d.current, d.target);
            return t => d.current = i(t);
          })
          .filter(function(d) {
            return +this.getAttribute("fill-opacity") || arcVisible(d.target);
          })
          .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
          .attrTween("d", d => () => arc(d.current));

        label.filter(function(d) {
            return +this.getAttribute("fill-opacity") || labelVisible(d.target);
          })
          .transition(t)
          .attr("fill-opacity", d => +labelVisible(d.target))
          .attrTween("transform", d => () => labelTransform(d.current));
      }

      function arcVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
      }

      function labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
      }

      function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = ((d.y0 + d.y1) / 2 * radius) + 110;
        return `rotate(${x - 90}) translate(${y},20) rotate(${x < 90 ? 0 : 90})`;
      }

      return svg.node();
    });
  main.variable(observer("data"))
    .define("data", ["FileAttachment"], function(FileAttachment) {
      return (
        FileAttachment("flare.json")
        .json()
      )
    });
  main.variable(observer("partition"))
    .define("partition", ["d3"], function(d3) {
      return (
        data => {
          const root = d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);
          return d3.partition()
            .size([2 * Math.PI, root.height + 1])
            (root);
        }
      )
    });
  main.variable(observer("color"))
    .define("color", ["d3", "data"], function(d3, data) {
      return (
        d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1))
      )
    });
  main.variable(observer("format"))
    .define("format", ["d3"], function(d3) {
      return (
        d3.format(",d")
      )
    });
  main.variable(observer("width"))
    .define("width", function() {
      return (
        5000
      )
    });
  main.variable(observer("radius"))
    .define("radius", ["width"], function(width) {
      return (
        width / 12
      )
    });
  main.variable(observer("arc"))
    .define("arc", ["d3", "radius"], function(d3, radius) {
      return (
        d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))
      )
    });
  main.variable(observer("d3"))
    .define("d3", ["require"], function(require) {
      return (
        require("d3@5")
      )
    });

  main.variable(observer('labels')).define("labels", ['chart', 'd3'], function(chart, d3) {


    const rootSvg = d3.select(chart);
    const g = d3.select(chart.children[0].children[1]);

    g.selectAll('text').call((text) => {
      text.each(function() {
        // debugger;
        var dataId = this.getAttribute('data-id');
        var hasChildren = this.getAttribute('has-children');

        var path = d3.select('path[data-id="' + 10 + '"]');

        var width = path.node().getBoundingClientRect().width;
        var text = d3.select(this);

        var words = text.text().split(/\s+/).reverse();
        //words = text.text().split(" ").reverse(),
        var word;
        var line = [];
        var lineNumber = 0;
        var y = text.attr("y");
        var dy = parseFloat(text.attr("dy"));
        var lineHeight = 1.1; // ems
        var newX = hasChildren ? -10 : 10;

        var tspan = text.text(null).append("tspan")
          .attr("x", newX)
          .attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));

          var textWidth = tspan.node().getComputedTextLength();
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            ++lineNumber;
            tspan = text.append("tspan").attr("x", newX)
            .attr("y", 0).attr("dy", lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    });

//
//     const elms = chart.querySelectorAll("text");
//
//     elms.forEach((node) => {
//
//         var width = Math.floor(node.getBoundingClientRect().width);
//
//         var text = node.textContent;
//         node.innerHTML = '';
//
//         var words = text.split(/\s+/).reverse();
//
//           // var finalTspans = [];
//           var word;
//           var line = [];
//           var lineNumber = 0;
//           var y = node.getAttribute("y");
//           var dy = parseFloat(node.getAttribute("dy"));
//
//           var lineHeight = 1.1;
//           var tspan = document.createElement('tspan');
//
//           // .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
//           tspan.setAttribute("y", y)
//           tspan.setAttribute("dy", dy + "em");
//
//           node.appendChild(tspan);
//
//           while (word = words.pop()) {
//             line.push(word);
//             tspan.textContent = line.join(" ");
//
//             var textWidth = tspan.getBoundingClientRect().width;
//
//             if (textWidth > width) {
//               line.pop();
//               tspan.textContent = line.join(" ");
//               line = [word];
//               ++lineNumber;
//               // finalTspans.push(tspan);
//               tspan = document.createElement('tspan')
//                 // .setAttribute("x", function(d) { return d.children || d._children ? -10 : 10; })
//                 .setAttribute("y", 0)
//                 .setAttribute("dy", lineNumber * lineHeight + dy + "em")
//                 .text(word);
//               node.appendChild(tspan);
//
//             }
//           }
//
//
//         });

      // const label = rootG.append("g")
      //   .attr("pointer-events", "none")
      //   .attr("text-anchor", "middle")
      //   //.attr("class", "wrap")
      //   .style("user-select", "none")
      //   .selectAll("text")
      //   .data(root.descendants()
      //     .slice(1))
      //   .join("text")
      //   .attr("dy", "0.35em")
      //   .attr("fill-opacity", d => +labelVisible(d.current))
      //   .attr("transform", d => labelTransform(d.current))
      //   .attr("width", d => {
      //     var p = svg.select("path[data-id='" + d.current.data.id + "']");
      //   })
      //   //.text(d => d.data.name)
      //   .text(d => d.data.name != undefined && d.data.name.length < 20 ? d.data.name : d.data.short)
      //   .call(wrap)


  });


  return main;
}
