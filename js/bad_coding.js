var repod = {};
repod.p3 = {
    config: {},
    appconfig: {}, //For functional tracking the user doesn't need to configure/will be auto configured.
    initConfig: function() {
        var firstrun = false; if (!localStorage.p3) { localStorage.p3 = '{}'; firstrun = true; }
        var read = JSON.parse(localStorage.p3);

        this.config = {
            buffer: Math.max(parseInt(read.buffer || 182),0), //parseInt(prompt("Insert buffer size:",70)) /* Amount of days to generate before and after the current day. */
            kiosk: (read.kiosk || false), //0 disabled, 1 true. Replaced with timeout ID after started.
            background: (read.background || "reddit:waterporn,earthporn,skyporn,SilhouettePorn"),
            quickstart: (read.quickstart || false),
        }

        this.configurator.spawn();
        if (firstrun) {
            this.configurator.open();
            this.configurator.save();
        }
    },
    init: function() {
        this.initConfig();
        this.background.apply();
        this.bind();
        var that = this;
        this.generate.items(function() {
            that.appconfig.initialOffset = window.innerWidth/2 - $(".item").eq(0).outerWidth(true)/2 - $(".item").eq(0).position().left;
            that.focus("first",true);
            if (that.config.kiosk) {
                //alert('The Calendar is currently set to Kiosk Mode to show off animations.\nIt may break itself. Styleswitcher in top-right corner.');
                that.kiosk.start();
            } else {
                $("#big_date").hide();
                that.updateDate();
                that.focus("today",that.config.quickstart);
            }
        });
        this.resize();
    },
    configurator: {
        spawn: function() {
            var that = this;

            $("body").append("<i id='config-spawn' class='fa fa-gear fa-spin' title='Configure'></i>");
            $("#config-spawn").click(function() { that.open(); });
        },
        open: function() {
            var that = this, temp = $('<div />'), config = repod.p3.config;

            $("#config-spawn").hide();

            //Eventually clean this up.
            temp.append("<div id='config-header'><table><tr>" +
                    "<td class='close'><i class='fa fa-fw fa-close' title='Close'></i></td>" +
                    "<td><i class='fa fa-fw fa-refresh' title='Reload current options'></i> <i class='fa fa-fw fa-trash' title='Reset options to default'></i></td><td><i class='fa fa-fw fa-upload' title='Export options'></i> <i class='fa fa-fw fa-download' title='Import options'></i></td>" +
                    "<td class='save'><i class='fa fa-fw fa-save' title='Save'></i></td>" +
                    "</tr></table></div>");
            var ops = [
                ["Day Buffer","<input data-config-target='buffer' value='"+config.buffer+"'></input>","Amount of days to spawn in each direction, 182 is a full year. Large amounts may be resource intensive."],
                ["<input type='checkbox' id='quickstart' data-config-target='quickstart' "+((config.quickstart)?"checked":"")+"> <label for='quickstart'>Quick Start</label>","","Skip starting animation to current date. Ignored by Kiosk mode."],
                ["<input type='checkbox' id='kioskmode' data-config-target='kiosk' "+((config.kiosk)?"checked":"")+"> <label for='kioskmode'>Kiosk Mode</label>","","Let the calendar animate freely, may break and reduce functionality but relaxing to watch."],
                ["Background <i class='fa fa-fw fa-refresh' style='float:right' title='Refresh saved background'></i>","<input data-config-target='background' value='"+config.background+"'></input>","Background image. Direct URL or special syntax. <strong>reddit:</strong> to scrape a comma-separated list of subreddits."]
            ];

            $.each(ops, function(i,v) { temp.append(that.genBlock(v[0],v[1],(v[2] || undefined))); });
            
            //Seek buttons
            temp.append('<table id="seekawayout"><tr><td><i class="fa fa-fast-backward"></i></td><td><i class="fa fa-step-backward"></i></td><td><i class="fa fa-eject"></i></td><td><i class="fa fa-step-forward"></i></td><td><i class="fa fa-fast-forward"></i></td></tr></table>');

            repod.p3.column.open(); //$("#container").animate({left: '250px'});
            $("#left").html(temp);
            this.bind();
        },
        close: function() {
            repod.p3.column.close();
            $("#config-spawn").show();
        },
        genBlock: function(title,input,help) {
            var block = $("<div class='config-block'/>").append($("<div class='config_title'/>").html(title));
            block.append($("<div class='config_input' />").html(input));
            if (help) { block.append($("<div class='config_help'/>").html(help)); }
            return block;
        },
        bind: function() {
            var that = this;
            $('#config-header .fa-close').one("click", function() { that.close(); });
            $('#config-header .fa-save').one("click", function() { that.save(); window.location.reload(); });
            $('#config-header .fa-trash').one("click", function() { that.nuke(); });
            $('#config-header .fa-refresh').on("click", function() { that.open(); });
            $('#config-header .fa-upload').on("click", function() { that.configexport(); });
            $('#config-header .fa-download').on("click", function() { that.configimport(); });
            $('.config-block .fa-refresh').on("click", function() { $(this).addClass('fa-spin'); repod.p3.background.apply(); });
            $(".fa-fast-backward").click(function() { repod.p3.focus("first"); });
            $(".fa-fast-forward").click(function() { repod.p3.focus("last"); });
            $(".fa-step-forward").click(function() { repod.p3.focus("next"); });
            $(".fa-step-backward").click(function() { repod.p3.focus("prev"); });
            $(".fa-eject").click(function() { repod.p3.focus("today"); });
        },
        configexport: function() {
            this.save();
            prompt("Exported with current options.", localStorage.p3);
        },
        configimport: function() {
            var temp = prompt("Paste exported data:");
            if (temp.length > 0) {
                localStorage.p3 = temp;
                window.location.reload();
            }
        },
        nuke: function() { delete localStorage.p3; window.location.reload(); }, //Easy button.jpg
        save: function() {
            $(".config-block [data-config-target]").each(function() {
                var prop = $(this).data("config-target"),
                    val = ($(this).attr("type") == 'checkbox') ? $(this).prop('checked') : ($(this).val() || $(this).text());

                switch (typeof repod.p3.config[prop]) {
                    case "boolean":
                        val = (val == 'true' || val == true)?1:0;
                    case "number":
                        val = parseInt(val);
                        break;
                    default:
                        break;
                }

                repod.p3.config[prop] = val; //Just in-case we miss anything, we set to local config then save.
            });
            localStorage['p3'] = JSON.stringify(repod.p3.config);
        }
    },
    column: {
        last: '',
        open: function(side) {
            var side = (side || this.last || 'left');
            this.close(side);
            $('#'+side).addClass('open');

        },
        close: function(side) {
            var side = (side || this.last || 'left');
            $('#'+side).removeClass('open').html('');
        }
    },
    background: {
        set: function() {
            var input = prompt("Enter special syntax or direct URL to wallpaper:\n(You'll still need to be on a style that allows it.)\n\n\"reddit:sub1,sub2\" to scrape both, \"reddit:\" to use built-in defaults.",(localStorage.p3['background'] || "reddit:waterporn,earthporn,skyporn,SilhouettePorn"));
            if (input) {
                localStorage.p3['background'] = input;
                this.apply();
            }
        },
        apply: function(input) {
            //Determine syntax
            var url = (input || repod.p3.config.background || false);
            if (/^reddit:/i.test(url)) { this.subreddit(url.split(":",2).pop()); } //Subreddit processor.

            if (url !== undefined && url.length > 0) { checkURL(url); } else { return false; }

            function checkURL(url) {
                url = url.replace(/https?:/,"");
                if (/\.(jpe?g|gif|png)$/i.test(url)) { $("#container").css({"background-image": "url('"+url+"')"}); $('.config-block .fa-refresh').removeClass('fa-spin'); }
                else if (/(www\.)?imgur\.com\//.test(url)) { checkURL("//i.imgur.com/"+url.match(/\/imgur.com\/(\w{4,})/).pop()+".png"); }
                else if (!input) {

                } else {
                    $('.config-block .fa-refresh').removeClass('fa-spin');
                }
            }
        },
        subreddit: function(input) {
            var subreddit = (input || ""), kit, that = this;
            if (subreddit == "!starter") { kit = []; } //Starter kit
            else { var kit = subreddit.split(","); } //Explode user-given.
            subreddit = kit[Math.floor(Math.random()*kit.length)];

            //var suffix = "/search.json?q=(site%3Aimgur.com+OR+site%3Aredd.it)&sort=top&restrict_sr=on&t=week&limit=10" //Weekly top 10, random.
            var suffix = "/random.json"; //Random, might not even return a valid wallpaper.
            $.getJSON("//www.reddit.com/r/"+subreddit+suffix, function(data) {
                var url = data[0].data.children[0].data.url;
                //var c = data.data.children.length, i = Math.floor(Math.random() * c), url = data.data.children[i].data.url;
                that.apply(url);
            });
        }
    },
    updateDate: function() {
        var d = Date.parse(($(".active") || $(".item").eq(this.determineCurrent()) || $(".item").eq(0)).attr("id"));
        $("#year").text(d.getFullYear());
        $("#month_no").text(d.getMonth() +1);
        $("#month").text(d.toLocaleString("en-us", { month: "long" }));
        $("#big_date").css({"visibility":"initial"}).fadeIn();
    },
    resize: function() {
        $("#top > a").css("font-size",$("#top").height() - (parseInt($("#top > a").css("padding-top")) + parseInt($("#top > a").css("padding-bottom"))));
    },
    bind: function() {
        //Planned to have update in real time
        /*setInterval(function() {
            repod.p3.focus(repod.p3.generateSelector(Date.now()));
        },1000);*/
        var that = this;
        //useless now
        //$(window).resize(function() { that.focus("active"); });
    },
    generate: {
        items: function(cb) {
            var buffer = repod.p3.config.buffer, m = buffer*2+1,
                d = (buffer+1).days().ago();
            for (i=0;i<m;i++) {
                var to = d.add(1).days();
                $("#moon_container").append(this.item(to));
                if (i+1 == m) {
                    setTimeout(function() { cb(); },500);
                }
            }
        },
        item: function(d) {
            if (!d) { d = new Date }
            var sel = d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(), day3 = d.toString("ddd"), type = "week"+(/(sat|sun)/i.test(day3)?'end':'day'),
            url = "background-image:url('icons/"+this.moon(d)+".png')", item = $("<div />",{id:sel,class:"item"})
            .append($("<div />",{class:"num small day3_"+day3.toLowerCase()+" "+type,text:d.getDate()}))
            .append($("<div />",{class:"three_day",text:day3}))
            .append(
                $("<div />",{class:"moon",style:url})
            );
            return item[0].outerHTML;
        },
        moon: function(d) {
            var d = Math.round(SunCalc.getMoonIllumination(d).phase * 100)
            if (d >= 0  && d <= 12) { return 1 } //New
            if (d >= 13 && d <= 24) { return 2 } //Waxing Crescent
            if (d >= 25 && d <= 37) { return 3 } //First Quarter
            if (d >= 38 && d <= 47) { return 4 } //Waxing Gibbous
            if (d >= 48 && d <= 59) { return 5 } //Full Moon
            if (d >= 60 && d <= 74) { return 6 } //Waning Gibbous
            if (d >= 75 && d <= 87) { return 7 } //Last Quarter
            if (d >= 88 && d <= 100) { return 8 } //Waning Crescent
        }
    },
    generateSelector: function(d) {
        /* Generates the proper selector. */
        return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()
    },
    lazyUpdateActive: function() {
        $('.active').removeClass('active');
        $('.item').eq(this.determineCurrent()).addClass('active');
    },
    determineCurrent: function() {
        var iW = ($("#moon_container").width() / $("#moon_container").children().length); /* Width of items */
        return Math.abs(Math.floor((parseInt($("#moon_container").css("left")) -  this.appconfig.initialOffset) / iW));
    },
    focus: function(id,skip) {
        var that = this;
        if (id == "first") { id = $(".item").first().attr("id"); }
        if (id == "last") { id = $(".item").last().attr("id"); }
        if (id == "next") { id = $(".active").next().attr("id"); }
        if (id == "prev") { id = $(".active").prev().attr("id"); }
        if (id == "today") { var d = new Date; id = d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
        if (id == "active") { id = $(".active").attr("id"); }
        id = "#"+id;

        if ($(id).hasClass("active") || !$(id).length) { return 0; }
        var offset = window.innerWidth/2 - $(id).outerWidth(true)/2 - $(id).position().left;

        var dur, dist;
        if ($(".active").length) {
            var dist, a = $(".active").index(), b = $(id).index();
            dist = (a>b)?a-b:b-a;
            dur = (dist >= 20) ? dist*150 : (dist < 8) ? dist*350 : dist*300;
        } else {
            dur = 500;
        }
        if (skip) dur = 0;

        $(".smallbar").addClass('p3animating'); //If themes want to override what the bars do while animating.

        $(id).addClass("target active").parent().animate({"left":offset}, {
            duration: dur,
            easing: 'easeInOutQuart',
            queue: true,
            step: function(now,tween) {
                var base = that.determineCurrent();
                $('.active').removeClass('active');
                $(".item").eq(base).addClass('active');

                that.updateDate(); //Update the upper date display.
            },
            progress: function(animation,progress,rms) {
                var p = progress * 100;
                $("#bottom.smallbar > span").hide();

                if (dist >= 32) { //Le arbitrary 32
                    var t;

                    if (p >= 28 && p <= 55) { var ease = 55-28, s = (1000/ease)/3500, t = "-="+s; }
                    if (p >= 65) { var ease = 100-65, cast = (1000/ease)/2500, t = "+="+cast; }

                    if (t) {

                        $("#center, .smallbar").css({opacity: t});
                        //$(".smallbar, #big_date, #moon_container").css({opacity: t});
                    }
                }
                if (p == 100) { $("#bottom.smallbar > span").show(); }

                //Determine current item centered with the date.
            },
            done: function() {
                $(".smallbar").removeClass('p3animating');
                $(this).css({"visibility":"initial"});
                $('.active').removeClass('active');
                $(id).addClass("active");
                that.updateDate();
                $("#center").fadeIn(800);
                if (repod.p3.config.kiosk > 0) { repod.p3.kiosk.start(); }
            }
        });
    },
    kiosk: {
        start: function() {
            repod.p3.config.kiosk = setTimeout(function() {
                //Hilariously buggy but shows the actual draw.
                var t = $(".item").eq(Math.floor(Math.random() * (repod.p3.config.buffer*2+1))).attr("id");
                repod.p3.focus(t);
            }, (Math.random() * 1000 * Math.floor(Math.random()*6)+5));
        }
    }
}

$(document).ready(function() {
    repod.p3.init();
});

//No man's land.

//Draggable item container?
/*x1 = $("#caro").offset().left-($("#caro_slides").children().length-1)*800-p,
y1 = $("#caro_slides").offset.top,
x2 = $("#caro").offset().left+p,
y2 = y1+800;*/
/*$("#moon_container").draggable({
    axis: "x",
    //containment: [0, window.width, 500, 600],
    start: function() {
    },
    stop: function(e, ui) {
        var grid_x = 197,
            grid_y = 0,
            elem = $(this),
            left = parseInt(elem.css('left')),
            top = parseInt(elem.css('top')),
            cx = (left % grid_x),
            cy = (top % grid_y);

        var new_left = (Math.abs(cx)+0.5*grid_x >= grid_x) ? (left - cx + (left/Math.abs(left))*grid_x) : (left - cx);
        var new_top = (Math.abs(cy)+0.5*grid_y >= grid_y) ? (top - cy + (top/Math.abs(top))*grid_y) : (top - cy);

        ui.helper.stop(true).animate({
            left: new_left,
            top: new_top,
            opacity: 1,
        }, 200, function() {
            that.lazyUpdateActive();
            that.updateDate();
        });
    },
});*/