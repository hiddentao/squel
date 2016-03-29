// Thanks to http://jsfiddle.net/mekwall/up4nu/

function enableRunnableSections() {
  $(".syntaxhighlighter").each(function(){
    var $elem = $(this),
      $codeContainer = $("table", $elem);

    var code = $codeContainer.text();
    if ($elem.hasClass("js") && 0 <= code.indexOf("log(")) {
      $elem.addClass("executable").attr("title", "Click to run");
      $elem.click(function(e) {
        e.preventDefault();

        // remove previous result
        $('.result', $elem).remove();

        // capture output
        var loggedCode = '(function(){ var __log = []; var log = function(obj) { __log.push(obj); };'
          + code
          + '; return __log;})();';

        var result = eval(loggedCode);

        // build result view
        var $result = $("<div class='result'><h5>Result</h5></div>");
        result.forEach(function(res) {
          if ('string' !== typeof res) {
            if (res.text && res.values) {
              res = "{\n text: " + JSON.stringify(res.text) + ",\n values: " + JSON.stringify(res.values) + "\n}";
            } else {
              res = JSON.stringify(res, null, 2);
            }
          }

          res = res.replace(/\n/g, '<br />');

          $result.append("<p>" + res + "</p>");
        });

        // show result view
        $codeContainer.after($result);
      });
    }
  });
}


function initScrollSpyMenus() {
  // Cache selectors
  var lastId,
    topMenu = $(".scrollSpy"),
    topMenuHeight = topMenu.outerHeight()+15,
  // All list items
  menuItems = topMenu.find("a"),
  // Anchors corresponding to menu items
  scrollItems = menuItems.map(function(){
    var item = $($(this).attr("href"));
    if (item.length) { return item; }
  });

  // Bind click handler to menu items
  // so we can get a fancy scroll animation
  menuItems.click(function(e){
    var href = $(this).attr("href"),
      offsetTop = href === "#" ? 0 : $(href).offset().top-topMenuHeight-50;
    $('html, body').stop().animate({
      scrollTop: offsetTop
    }, 300);
    e.preventDefault();
  });

  // Bind to scroll
  $(window).scroll(function(){
    // Get container scroll position
    var fromTop = $(this).scrollTop()+topMenuHeight;

    // Get id of current scroll item
    var cur = scrollItems.map(function(){
      if ($(this).offset().top < fromTop+100)
        return this;
    });
    // Get the id of the current element
    cur = cur[cur.length-1];
    var id = cur && cur.length ? cur[0].id : "";

    var oldActiveItem = menuItems.filter("[href=#"+lastId+"]").parent(),
      newActiveItem = menuItems.filter("[href=#"+id+"]").parent();

    if (lastId !== id) {
      lastId = id;

      // remove indicator from old
      oldActiveItem.removeClass('active');

      var oldParentItem = oldActiveItem.parent().hasClass('scrollSpy') ? oldActiveItem : oldActiveItem.parent().parent();
      var newParentItem = newActiveItem.parent().hasClass('scrollSpy') ? newActiveItem: newActiveItem.parent().parent();

      // parents changed?
      if (oldParentItem.children('a').attr('href') !== newParentItem.children('a').attr('href')) {
        // close old submenu
        oldParentItem.children('ul').hide();
        // open new submenu
        newParentItem.children('ul').show();
      }

      // add indicator
      newActiveItem.addClass("active")
    }
  });
}