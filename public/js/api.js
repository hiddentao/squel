var jqAPISection = null,
  jqSidebarList = null;


var _each = function(obj, cb) {
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      cb.call(null, i, obj[i]);
    }
  }
};

var _getHashTag = function(str) {
  return (str.toLowerCase().replace(/[\.]+/ig, '_').replace(/[\(\)]+/ig, ''));
};


var _formatStr = function(str) {
  var links = str.match(/\[\[([^\[\]]+)\]\]/ig);

  if (links) {
    for (var i = 0; i<links.length; ++i) {
      var linkKey = links[i].match(/[^\[\]]+/ig).pop(),
        hashTag = _getHashTag(linkKey);
      str = str.replace(links[i], '<a href="#' + hashTag + '">' + linkKey + '</a>');
    }
  }

  return str;
};


var _addEntry = function(key, value) {
  var hashTag = _getHashTag(key);

  var jqDiv = $('<article id="' + hashTag + '"></article>');
  var title = (value.title ? value.title : key);
  jqDiv.append('<a name="' + hashTag + '" href="#' + hashTag + '"><h2>' + title + '</h2></a>');

  jqDiv.append('<div class="description">' + _formatStr(value.desc) + '</div>');

  if (value.flavours) {
    jqDiv.append('<div class="flavours">Only in flavours: <span>' + value.flavours.join(', ') + '</span></div>');
  }

  if (value.params) {
    var jqParamsList = $('<ul />');

    _each(value.params, function(paramName, paramMeta) {
      var jqParamItem = $('<li />');

      jqParamItem.append('<span class="name">' + paramName + '</span>');
      jqParamItem.append('<span class="type">' + _formatStr(paramMeta.type) + '</span>');
      var desc = paramMeta.desc;
      if (undefined !== paramMeta.defaultValue) {
        desc = '<em>Optional</em>. ' + desc + ' Default is <code>' + paramMeta.defaultValue + '</code>.';
      }
      jqParamItem.append('<span class="description">' + _formatStr(desc) + '</span>');

      jqParamsList.append(jqParamItem);
    });

    var jqParamsDiv = $('<div class="parameters" />');
    jqParamsDiv.append(jqParamsList);
    jqDiv.append(jqParamsDiv);
  }

  if (value.returns) {
    jqDiv.append('<div class="returns"><span><code>' + _formatStr(value.returns) + '</code></span></div>');
  }

  if (value.subKeys) {
    var jqSubKeyList = $('<ul />');

    _each(value.subKeys, function(paramName, paramMeta) {
      var jqParamItem = $('<li />');

      jqParamItem.append('<span class="name">' + paramName + '</span>');
      jqParamItem.append('<span class="type">' + _formatStr(paramMeta.type) + '</span>');
      var desc = paramMeta.desc;
      desc = desc + ' Default is <code>' + paramMeta.defaultValue + '</code>.';
      jqParamItem.append('<span class="description">' + _formatStr(desc) + '</span>');

      jqSubKeyList.append(jqParamItem);
    });

    var jqSubKeyDiv = $('<div class="subKeys" />');
    jqSubKeyDiv.append(jqSubKeyList);
    jqDiv.append(jqSubKeyDiv);
  }

  jqAPISection.append(jqDiv);
};


var buildApiDocs = function(tree) {
  jqAPISection = $('#api');
  jqSidebarList = $('aside > ul');

  // add loading indicators
  jqAPISection.html('<p class="loading">Loading</p>');
  jqSidebarList.hide();

  // iterate through the tree
  _each(tree, function(key, meta) {
    var keyHashTag = _getHashTag(key);

    // add api article for it
    _addEntry(key, meta);

    // sidebar list item
    var indexContainer = $('<li >');
    indexContainer.append('<a href="#' + keyHashTag + '">' + key + '</a>');

    if (meta.children) {
      var indexList = $('<ul />');

      _each(meta.children, function(childKey, childMeta) {
        childMeta.title = '<span>' + key + '</span>' + childKey;
        _addEntry(key + childKey, childMeta);

        var indexItem = $('<li />');
        indexItem.append('<a href="#' + _getHashTag(key + childKey) + '">' + childKey + '</a>');
        indexList.append(indexItem);
      });

      indexContainer.append(indexList);
    }

    jqSidebarList.append(indexContainer);
  });


  // aside menu click interactions
  $('aside > ul > li').each(function() {
    var jqSectionItem = $(this),
      jqChildList = jqSectionItem.children('ul');

    $('a', jqSectionItem).click(function() {
      // hide all other child lists
      $('aside > ul > li').children('ul').hide();
      // show mine
      jqChildList.show();
    });
  });

  // remove loading indicators
  jqAPISection.children('.loading').remove();
  jqSidebarList.show();

  // scroll spy
  initScrollSpyMenus();
};



