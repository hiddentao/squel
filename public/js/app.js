// Thanks to http://jsfiddle.net/mekwall/up4nu/

$(function() {
  // Cache selectors
  var lastId,
    topMenu = $("header nav.guide"),
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

    if (lastId !== id) {
      lastId = id;
      // Set/remove active class
      menuItems
        .parent().removeClass("active")
        .end().filter("[href=#"+id+"]").parent().addClass("active");
    }
  });

  // highlight code blocks
  SyntaxHighlighter.defaults['gutter'] = false;
  SyntaxHighlighter.defaults['toolbar'] = false;
  SyntaxHighlighter.highlight();

  // allow viewer to execute highlighted js code blocks
  enableRunnableSections();
});


function enableRunnableSections() {
  $(".syntaxhighlighter").each(function(){
    var elem = $(this);
    var code = $("table", elem).text();
    if (elem.hasClass("js") && 0 <= code.indexOf("alert")) {
      elem.addClass("executable").attr("title", "Click to run");
      elem.click(function(e) {
        e.preventDefault();
        eval(code);
      });
    }
  });
}
