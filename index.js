var AtD;

var jQuery = require("jquery");
var csshttprequest = require("csshttprequest");

var currentVersion = "zergleb~jquery.atd.textarea@1.0.1.5";

(function(jQuery, csshttprequest) {
var AtDCore, EXPORTED_SYMBOLS, TokenIterator;


AtDCore = function() {
  this.ignore_types = ["Bias Language", "Cliches", "Complex Expression", "Diacritical Marks", "Double Negatives", "Hidden Verbs", "Jargon Language", "Passive voice", "Phrases to Avoid", "Redundant Expression"];
  this.ignore_strings = {};
  this.i18n = {};
};

TokenIterator = function(tokens) {
  this.tokens = tokens;
  this.index = 0;
  this.count = 0;
  this.last = 0;
};

EXPORTED_SYMBOLS = ["AtDCore"];

AtDCore.prototype.getLang = function(key, defaultk) {
  if (this.i18n[key] === undefined) {
    return defaultk;
  }
  return this.i18n[key];
};

AtDCore.prototype.addI18n = function(localizations) {
  this.i18n = localizations;
};

AtDCore.prototype.setIgnoreStrings = function(string) {
  var parent;
  parent = this;
  this.map(string.split(/,\s*/g), function(string) {
    parent.ignore_strings[string] = 1;
  });
};

AtDCore.prototype.showTypes = function(string) {
  var ignore_types, show_types, types;
  show_types = string.split(/,\s*/g);
  types = {};
  types["Double Negatives"] = 1;
  types["Hidden Verbs"] = 1;
  types["Passive voice"] = 1;
  types["Bias Language"] = 1;
  types.Cliches = 1;
  types["Complex Expression"] = 1;
  types["Diacritical Marks"] = 1;
  types["Jargon Language"] = 1;
  types["Phrases to Avoid"] = 1;
  types["Redundant Expression"] = 1;
  ignore_types = [];
  this.map(show_types, function(string) {
    types[string] = undefined;
  });
  this.map(this.ignore_types, function(string) {
    if (types[string] !== undefined) {
      ignore_types.push(string);
    }
  });
  this.ignore_types = ignore_types;
};

AtDCore.prototype.makeError = function(error_s, tokens, type, seps, pre) {
  var struct;
  struct = {};
  struct.type = type;
  struct.string = error_s;
  struct.tokens = tokens;
  if (new RegExp("\\b" + error_s + "\\b").test(error_s)) {
    struct.regexp = new RegExp("(?!" + error_s + "<)\\b" + error_s.replace(/\s+/g, seps) + "\\b");
  } else if (new RegExp(error_s + "\\b").test(error_s)) {
    struct.regexp = new RegExp("(?!" + error_s + "<)" + error_s.replace(/\s+/g, seps) + "\\b");
  } else if (new RegExp("\\b" + error_s).test(error_s)) {
    struct.regexp = new RegExp("(?!" + error_s + "<)\\b" + error_s.replace(/\s+/g, seps));
  } else {
    struct.regexp = new RegExp("(?!" + error_s + "<)" + error_s.replace(/\s+/g, seps));
  }
  struct.used = false;
  return struct;
};

AtDCore.prototype.addToErrorStructure = function(errors, list, type, seps) {
  var parent;
  parent = this;
  this.map(list, function(error) {
    var first, pre, tokens;
    tokens = error.word.split(/\s+/);
    pre = error.pre;
    first = tokens[0];
    if (errors["__" + first] === undefined) {
      errors["__" + first] = {};
      errors["__" + first].pretoks = {};
      errors["__" + first].defaults = [];
    }
    if (pre === "") {
      errors["__" + first].defaults.push(parent.makeError(error.word, tokens, type, seps, pre));
    } else {
      if (errors["__" + first].pretoks["__" + pre] === undefined) {
        errors["__" + first].pretoks["__" + pre] = [];
      }
      errors["__" + first].pretoks["__" + pre].push(parent.makeError(error.word, tokens, type, seps, pre));
    }
  });
};

AtDCore.prototype.buildErrorStructure = function(spellingList, enrichmentList, grammarList) {
  var errors, seps;
  seps = this._getSeparators();
  errors = {};
  this.addToErrorStructure(errors, spellingList, "hiddenSpellError", seps);
  this.addToErrorStructure(errors, grammarList, "hiddenGrammarError", seps);
  this.addToErrorStructure(errors, enrichmentList, "hiddenSuggestion", seps);
  return errors;
};

AtDCore.prototype._getSeparators = function() {
  var i, re, str;
  re = "";
  i = void 0;
  str = "\"s!#$%&()*+,./:;<=>?@[]^_{|}";
  i = 0;
  while (i < str.length) {
    re += "\\" + str.charAt(i);
    i++;
  }
  return "(?:(?:[ " + re + "])|(?:\\-\\-))+";
};

AtDCore.prototype.processXML = function(responseXML) {
  var ecount, enrichment, errorContext, errorDescription, errorString, errorStruct, errorType, errorUrl, errors, grammarErrors, i, j, spellingErrors, suggestion, suggestions, types;
  types = {};
  this.map(this.ignore_types, function(type) {
    types[type] = 1;
  });
  this.suggestions = [];
  errors = responseXML.getElementsByTagName("error");
  grammarErrors = [];
  spellingErrors = [];
  enrichment = [];
  i = 0;
  while (i < errors.length) {
    if (errors[i].getElementsByTagName("string").item(0).firstChild) {
      errorString = errors[i].getElementsByTagName("string").item(0).firstChild.data;
      errorType = errors[i].getElementsByTagName("type").item(0).firstChild.data;
      errorDescription = errors[i].getElementsByTagName("description").item(0).firstChild.data;
      errorContext = void 0;
      if (errors[i].getElementsByTagName("precontext").item(0).firstChild) {
        errorContext = errors[i].getElementsByTagName("precontext").item(0).firstChild.data;
      } else {
        errorContext = "";
      }
      if (this.ignore_strings[errorString] === undefined) {
        suggestion = {};
        suggestion.description = errorDescription;
        suggestion.suggestions = [];
        suggestion.matcher = new RegExp("^" + errorString.replace(/\s+/, this._getSeparators()) + "$");
        suggestion.context = errorContext;
        suggestion.string = errorString;
        suggestion.type = errorType;
        this.suggestions.push(suggestion);
        var suggestionOptions = errors[i].getElementsByTagName("suggestions").item(0);
        if (suggestionOptions !== undefined && suggestionOptions !== null) {
          suggestions = suggestionOptions.getElementsByTagName("option");
          j = 0;
          while (j < suggestions.length) {
            suggestion.suggestions.push(suggestions[j].firstChild.data);
            j++;
          }
        }
        if (errors[i].getElementsByTagName("url").item(0)) {
          errorUrl = errors[i].getElementsByTagName("url").item(0).firstChild.data;
          suggestion.moreinfo = errorUrl + "&theme=tinymce";
        }
        if (types[errorDescription] === undefined) {
          if (errorType === "suggestion") {
            enrichment.push({
              word: errorString,
              pre: errorContext
            });
          }
          if (errorType === "grammar") {
            grammarErrors.push({
              word: errorString,
              pre: errorContext
            });
          }
        }
        if (errorType === "spelling" || errorDescription === "Homophone") {
          spellingErrors.push({
            word: errorString,
            pre: errorContext
          });
        }
        if (errorDescription === "Cliches") {
          suggestion.description = "Clich&eacute;s";
        }
        if (errorDescription === "Spelling") {
          suggestion.description = this.getLang("menu_title_spelling", "Spelling");
        }
        if (errorDescription === "Repeated Word") {
          suggestion.description = this.getLang("menu_title_repeated_word", "Repeated Word");
        }
        if (errorDescription === "Did you mean...") {
          suggestion.description = this.getLang("menu_title_confused_word", "Did you mean...");
        }
      }
    }
    i++;
  }
  errorStruct = void 0;
  ecount = spellingErrors.length + grammarErrors.length + enrichment.length;
  if (ecount > 0) {
    errorStruct = this.buildErrorStructure(spellingErrors, enrichment, grammarErrors);
  } else {
    errorStruct = undefined;
  }
  return {
    errors: errorStruct,
    count: ecount,
    suggestions: this.suggestions
  };
};

AtDCore.prototype.findSuggestion = function(element) {
  var context, errorDescription, i, key, len, text;
  text = element.innerHTML;
  context = (this.getAttrib(element, "pre") + "").replace(/[\\,!\\?\\."\s]/g, "");
  if (this.getAttrib(element, "pre") === undefined) {
    alert(element.innerHTML);
  }
  errorDescription = undefined;
  len = this.suggestions.length;
  i = 0;
  while (i < len) {
    key = this.suggestions[i].string;
    if ((context === "" || context === this.suggestions[i].context) && this.suggestions[i].matcher.test(text)) {
      errorDescription = this.suggestions[i];
      break;
    }
    i++;
  }
  return errorDescription;
};

TokenIterator.prototype.next = function() {
  var current;
  current = this.tokens[this.index];
  this.count = this.last;
  this.last += current.length + 1;
  this.index++;
  if (current !== "") {
    if (current[0] === "'") {
      current = current.substring(1, current.length);
    }
    if (current[current.length - 1] === "'") {
      current = current.substring(0, current.length - 1);
    }
  }
  return current;
};

TokenIterator.prototype.hasNext = function() {
  return this.index < this.tokens.length;
};

TokenIterator.prototype.hasNextN = function(n) {
  return (this.index + n) < this.tokens.length;
};

TokenIterator.prototype.skip = function(m, n) {
  this.index += m;
  this.last += n;
  if (this.index < this.tokens.length) {
    this.count = this.last - this.tokens[this.index].length;
  }
};

TokenIterator.prototype.getCount = function() {
  return this.count;
};

TokenIterator.prototype.peek = function(n) {
  var end, peepers, x;
  peepers = [];
  end = this.index + n;
  x = this.index;
  while (x < end) {
    peepers.push(this.tokens[x]);
    x++;
  }
  return peepers;
};

AtDCore.prototype.markMyWords = function(container_nodes, errors) {
  var ecount, iterator, nl, parent, seps;
  seps = new RegExp(this._getSeparators());
  nl = [];
  ecount = 0;
  parent = this;
  this._walk(container_nodes, function(n) {
    if (n.nodeType === 3 && !parent.isMarkedNode(n)) {
      nl.push(n);
    }
  });
  iterator = void 0;
  this.map(nl, function(n) {
    var bringTheHurt, checkErrors, curr, current, defaults, doReplaces, done, foundStrings, newNode, prev, previous, regexp, result, token, tokens, v, x;
    v = void 0;
    if (n.nodeType === 3) {
      v = n.nodeValue;
      tokens = n.nodeValue.split(seps);
      previous = "";
      doReplaces = [];
      iterator = new TokenIterator(tokens);

      checkErrors = function(error) {
            var oldlen;
            if (error !== undefined && error != null && !error.used && foundStrings["__" + error.string] === undefined && error.regexp.test(curr)) {
              oldlen = curr.length;
              foundStrings["__" + error.string] = 1;
              doReplaces.push([error.regexp, "<span class=\"" + error.type + "\" pre=\"" + previous + "\">$&</span>"]);
              error.used = true;
              done = true;
            }
          };

      while (iterator.hasNext()) {
        token = iterator.next();
        current = errors["__" + token];
        defaults = void 0;
        if (current !== undefined && current !== null && current.pretoks !== undefined && current.pretoks !== null) {
          defaults = current.defaults;
          current = current.pretoks["__" + previous];
          done = false;
          prev = void 0;
          curr = void 0;
          prev = v.substr(0, iterator.getCount());
          curr = v.substr(prev.length, v.length);
          
          foundStrings = {};
          if (current !== undefined && current !== null) {
            previous = previous + " ";
            parent.map(current, checkErrors);
          }
          if (!done) {
            previous = "";
            parent.map(defaults, checkErrors);
          }
        }
        previous = token;
      }
      if (doReplaces.length > 0) {
        newNode = n;
        x = 0;
        bringTheHurt = function(node) {
            var contents, nnode, y;
            if (node.nodeType === 3) {
              ecount++;
              if (parent.isIE() && node.nodeValue.length > 0 && node.nodeValue.substr(0, 1) === " ") {
                return parent.create("<span class=\"mceItemHidden\">&nbsp;</span>" + node.nodeValue.substr(1, node.nodeValue.length - 1).replace(regexp, result), false);
              } else {
                return parent.create(node.nodeValue.replace(regexp, result), false);
              }
            } else {
              contents = parent.contents(node);
              y = 0;
              while (y < contents.length) {
                if (contents[y].nodeType === 3 && regexp.test(contents[y].nodeValue)) {
                  nnode = void 0;
                  if (parent.isIE() && contents[y].nodeValue.length > 0 && contents[y].nodeValue.substr(0, 1) === " ") {
                    nnode = parent.create("<span class=\"mceItemHidden\">&nbsp;</span>" + contents[y].nodeValue.substr(1, contents[y].nodeValue.length - 1).replace(regexp, result), true);
                  } else {
                    nnode = parent.create(contents[y].nodeValue.replace(regexp, result), true);
                  }
                  parent.replaceWith(contents[y], nnode);
                  parent.removeParent(nnode);
                  ecount++;
                  return node;
                }
                y++;
              }
              return node;
            }
          };
        while (x < doReplaces.length) {
          regexp = doReplaces[x][0];
          result = doReplaces[x][1];
          
          newNode = bringTheHurt(newNode);
          x++;
        }
        parent.replaceWith(n, newNode);
      }
    }
  });
  return ecount;
};

AtDCore.prototype._walk = function(elements, f) {
  var i;
  i = void 0;
  i = 0;
  while (i < elements.length) {
    f.call(f, elements[i]);
    this._walk(this.contents(elements[i]), f);
    i++;
  }
};

AtDCore.prototype.removeWords = function(node, w) {
  var count, parent;
  count = 0;
  parent = this;
  this.map(this.findSpans(node).reverse(), function(n) {
    var nnode;
    if (n && (parent.isMarkedNode(n) || parent.hasClass(n, "mceItemHidden") || parent.isEmptySpan(n))) {
      if (n.innerHTML === "&nbsp;") {
        nnode = document.createTextNode(" ");
        parent.replaceWith(n, nnode);
      } else if (!w || n.innerHTML === w) {
        parent.removeParent(n);
        count++;
      }
    }
  });
  return count;
};

AtDCore.prototype.isEmptySpan = function(node) {
  return this.getAttrib(node, "class") === "" && this.getAttrib(node, "style") === "" && this.getAttrib(node, "id") === "" && !this.hasClass(node, "Apple-style-span") && this.getAttrib(node, "mce_name") === "";
};

AtDCore.prototype.isMarkedNode = function(node) {
  return this.hasClass(node, "hiddenGrammarError") || this.hasClass(node, "hiddenSpellError") || this.hasClass(node, "hiddenSuggestion");
};

AtDCore.prototype.applySuggestion = function(element, suggestion) {
  var node;
  if (suggestion === "(omit)") {
    this.remove(element);
  } else {
    node = this.create(suggestion);
    this.replaceWith(element, node);
    this.removeParent(node);
  }
};

AtDCore.prototype.hasErrorMessage = function(xmlr) {
  return xmlr !== undefined && xmlr !== null && (xmlr.getElementsByTagName("message").item(0));
};

AtDCore.prototype.getErrorMessage = function(xmlr) {
  return xmlr.getElementsByTagName("message").item(0);
};

AtDCore.prototype.isIE = function() {
  return navigator.appName === "Microsoft Internet Explorer";
};

AtD = {
  rpc: "",
  rpc_css: "http://www.polishmywriting.com/atd-jquery/server/proxycss.php?data=",
  rpc_css_lang: "en",
  api_key: "",
  i18n: {},
  listener: {}
};

AtD.getLang = function(key, defaultk) {
  if (AtD.i18n[key] === undefined) {
    return defaultk;
  }
  return AtD.i18n[key];
};

AtD.addI18n = function(localizations) {
  AtD.i18n = localizations;
  AtD.core.addI18n(localizations);
};

AtD.setIgnoreStrings = function(string) {
  AtD.core.setIgnoreStrings(string);
};

AtD.showTypes = function(string) {
  AtD.core.showTypes(string);
};

AtD.checkCrossAJAX = function(container_id, callback_f) {
  var container, html, text;
  if (typeof AtD_proofread_click_count !== "undefined") {
    AtD_proofread_click_count++;
  }
  AtD.callback_f = callback_f;
  AtD.remove(container_id);
  container = jQuery("#" + container_id);
  html = container.html();
  text = jQuery.trim(container.html());
  text = encodeURIComponent(text.replace(/\%/g, "%25"));
  if ((text.length > 2000 && navigator.appName === "Microsoft Internet Explorer") || text.length > 7800) {
    if (callback_f !== undefined && callback_f.error !== undefined) {
      callback_f.error("Maximum text length for this browser exceeded");
    }
    return;
  }
  csshttprequest.get(AtD.rpc_css + text + "&lang=" + AtD.rpc_css_lang + "&nocache=" + (new Date().getTime()), function(response) {
    var count, xml;
    xml = void 0;
    if (navigator.appName === "Microsoft Internet Explorer") {
      xml = new ActiveXObject("Microsoft.XMLDOM");
      xml.async = false;
      xml.loadXML(response);
    } else {
      xml = (new DOMParser()).parseFromString(response, "text/xml");
    }
    if (AtD.core.hasErrorMessage(xml)) {
      if (AtD.callback_f !== undefined && AtD.callback_f.error !== undefined) {
        AtD.callback_f.error(AtD.core.getErrorMessage(xml));
      }
      return;
    }
    AtD.container = container_id;
    count = AtD.processXML(container_id, xml);
    if (AtD.callback_f !== undefined && AtD.callback_f.ready !== undefined) {
      AtD.callback_f.ready(count);
    }
    if (count === 0 && AtD.callback_f !== undefined && AtD.callback_f.success !== undefined) {
      AtD.callback_f.success(count);
    }
    AtD.counter = count;
    AtD.count = count;
  });
};

AtD.check = function(container_id, callback_f) {
  var container, html, text;
  if (typeof AtD_proofread_click_count !== "undefined") {
    AtD_proofread_click_count++;
  }
  AtD.callback_f = callback_f;
  AtD.remove(container_id);
  container = jQuery("#" + container_id);
  html = container.html();
  text = jQuery.trim(container.html());
  text = encodeURIComponent(text);
  jQuery.ajax({
    type: "POST",
    url: AtD.rpc + "/checkDocument",
    data: "key=" + AtD.api_key + "&data=" + text,
    format: "raw",
    dataType: (jQuery.browser.msie ? "text" : "xml"),
    error: function(XHR, status, error) {
      if (AtD.callback_f !== undefined && AtD.callback_f.error !== undefined) {
        AtD.callback_f.error(status + ": " + error);
      }
    },
    success: function(data) {
      var count, xml;
      xml = void 0;
      if (typeof data === "string") {
        xml = new ActiveXObject("Microsoft.XMLDOM");
        xml.async = false;
        xml.loadXML(data);
      } else {
        xml = data;
      }
      if (AtD.core.hasErrorMessage(xml)) {
        if (AtD.callback_f !== undefined && AtD.callback_f.error !== undefined) {
          AtD.callback_f.error(AtD.core.getErrorMessage(xml));
        }
        return;
      }
      AtD.container = container_id;
      count = AtD.processXML(container_id, xml);
      if (AtD.callback_f !== undefined && AtD.callback_f.ready !== undefined) {
        AtD.callback_f.ready(count);
      }
      if (count === 0 && AtD.callback_f !== undefined && AtD.callback_f.success !== undefined) {
        AtD.callback_f.success(count);
      }
      AtD.counter = count;
      AtD.count = count;
    }
  });
};

AtD.remove = function(container_id) {
  AtD._removeWords(container_id, null);
};

AtD.clickListener = function(event) {
  if (AtD.core.isMarkedNode(event.target)) {
    AtD.suggest(event.target);
  }
};

AtD.processXML = function(container_id, responseXML) {
  var results;
  results = AtD.core.processXML(responseXML);
  if (results.count > 0) {
    results.count = AtD.core.markMyWords(jQuery("#" + container_id).contents(), results.errors);
  }
  jQuery("#" + container_id).unbind("click", AtD.clickListener);
  jQuery("#" + container_id).click(AtD.clickListener);
  return results.count;
};

AtD.useSuggestion = function(word) {
  this.core.applySuggestion(AtD.errorElement, word);
  AtD.counter--;
  if (AtD.counter === 0 && AtD.callback_f !== undefined && AtD.callback_f.success !== undefined) {
    AtD.callback_f.success(AtD.count);
  }
};

AtD.editSelection = function() {
  var parent;
  parent = AtD.errorElement.parent();
  if (AtD.callback_f !== undefined && AtD.callback_f.editSelection !== undefined) {
    AtD.callback_f.editSelection(AtD.errorElement);
  }
  if (AtD.errorElement.parent() !== parent) {
    AtD.counter--;
    if (AtD.counter === 0 && AtD.callback_f !== undefined && AtD.callback_f.success !== undefined) {
      AtD.callback_f.success(AtD.count);
    }
  }
};

AtD.ignoreSuggestion = function() {
  AtD.core.removeParent(AtD.errorElement);
  AtD.counter--;
  if (AtD.counter === 0 && AtD.callback_f !== undefined && AtD.callback_f.success !== undefined) {
    AtD.callback_f.success(AtD.count);
  }
};

AtD.ignoreAll = function(container_id) {
  var removed, target;
  target = AtD.errorElement.text();
  removed = AtD._removeWords(container_id, target);
  AtD.counter -= removed;
  if (AtD.counter === 0 && AtD.callback_f !== undefined && AtD.callback_f.success !== undefined) {
    AtD.callback_f.success(AtD.count);
  }
  if (AtD.callback_f !== undefined && AtD.callback_f.ignore !== undefined) {
    AtD.callback_f.ignore(target);
    AtD.core.setIgnoreStrings(target);
  }
};

AtD.explainError = function() {
  if (AtD.callback_f !== undefined && AtD.callback_f.explain !== undefined) {
    AtD.callback_f.explain(AtD.explainURL);
  }
};

AtD.suggest = function(element) {
  var errorDescription, i, pos, suggest, width;
  if (jQuery("#suggestmenu").length === 0) {
    suggest = jQuery("<div id=\"suggestmenu\"></div>");
    suggest.prependTo("body");
  } else {
    suggest = jQuery("#suggestmenu");
    suggest.hide();
  }
  errorDescription = AtD.core.findSuggestion(element);
  AtD.errorElement = jQuery(element);
  suggest.empty();
  if (errorDescription === undefined) {
    suggest.append("<strong>" + AtD.getLang("menu_title_no_suggestions", "No suggestions") + "</strong>");
  } else if (errorDescription.suggestions.length === 0) {
    suggest.append("<strong>" + errorDescription.description + "</strong>");
  } else {
    suggest.append("<strong>" + errorDescription.description + "</strong>");
    i = 0;
    while (i < errorDescription.suggestions.length) {
      var sugg = errorDescription.suggestions[i];
      suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').useSuggestion('" + sugg.replace(/'/, "\\'") + "')\">" + sugg + "</a>");
      i++;
    }
  }
  if (AtD.callback_f !== undefined && AtD.callback_f.explain !== undefined && errorDescription.moreinfo !== undefined) {
    suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').explainError()\" class=\"spell_sep_top\">" + AtD.getLang("menu_option_explain", "Explain...") + "</a>");
    AtD.explainURL = errorDescription.moreinfo;
  }
  suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').ignoreSuggestion()\" class=\"spell_sep_top\">" + AtD.getLang("menu_option_ignore_once", "Ignore suggestion") + "</a>");
  if (AtD.callback_f !== undefined && AtD.callback_f.editSelection !== undefined) {
    if (AtD.callback_f !== undefined && AtD.callback_f.ignore !== undefined) {
      suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').ignoreAll('" + AtD.container + "')\">" + AtD.getLang("menu_option_ignore_always", "Ignore always") + "</a>");
    } else {
      suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').ignoreAll('" + AtD.container + "')\">" + AtD.getLang("menu_option_ignore_all", "Ignore all") + "</a>");
    }
    suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').editSelection('" + AtD.container + "')\" class=\"spell_sep_bottom spell_sep_top\">" + AtD.getLang("menu_option_edit_selection", "Edit Selection...") + "</a>");
  } else {
    if (AtD.callback_f !== undefined && AtD.callback_f.ignore !== undefined) {
      suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').ignoreAll('" + AtD.container + "')\" class=\"spell_sep_bottom\">" + AtD.getLang("menu_option_ignore_always", "Ignore always") + "</a>");
    } else {
      suggest.append("<a href=\"javascript:require(\'" + currentVersion + "\').ignoreAll('" + AtD.container + "')\" class=\"spell_sep_bottom\">" + AtD.getLang("menu_option_ignore_all", "Ignore all") + "</a>");
    }
  }
  pos = jQuery(element).offset();
  width = jQuery(element).width();
  jQuery(suggest).css({
    left: (pos.left + width) + "px",
    top: pos.top + "px"
  });
  jQuery(suggest).fadeIn(200);
  AtD.suggestShow = true;
  setTimeout((function() {
    jQuery("body").bind("click", function() {
      if (!AtD.suggestShow) {
        jQuery("#suggestmenu").fadeOut(200);
      }
    });
  }), 1);
  setTimeout((function() {
    AtD.suggestShow = false;
  }), 2);
};

AtD._removeWords = function(container_id, w) {
  return this.core.removeWords(jQuery("#" + container_id), w);
};

AtD.initCoreModule = function() {
  var core;
  core = new AtDCore();
  core.hasClass = function(node, className) {
    return jQuery(node).hasClass(className);
  };
  core.map = jQuery.map;
  core.contents = function(node) {
    return jQuery(node).contents();
  };
  core.replaceWith = function(old_node, new_node) {
    return jQuery(old_node).replaceWith(new_node);
  };
  core.findSpans = function(parent) {
    return jQuery.makeArray(parent.find("span"));
  };
  core.create = function(node_html, isTextNode) {
    return jQuery("<span class=\"mceItemHidden\">" + node_html + "</span>");
  };
  core.remove = function(node) {
    return jQuery(node).remove();
  };
  core.removeParent = function(node) {
    if (jQuery(node).unwrap) {
      return jQuery(node).contents().unwrap();
    } else {
      return jQuery(node).replaceWith(jQuery(node).html());
    }
  };
  core.getAttrib = function(node, name) {
    return jQuery(node).attr(name);
  };
  return core;
};

AtD.core = AtD.initCoreModule();

AtD.textareas = {};

AtD.isChecking = false;

AtD.restoreTextArea = function(id, scope) {
  var content = void 0;
  var options = AtD.textareas[id];

  if (options === undefined || options.before === options.link.html()) {
    return;
  }

  AtD.remove(id);
  jQuery("#AtD_sync_").remove();
  if (navigator.appName === "Microsoft Internet Explorer") {
    content = jQuery("#" + id).html().replace(/<BR.*?class.*?atd_remove_me.*?>/g, "\n");
  }
  content = jQuery("#" + id).html();
  content = content.replace(/\&lt\;/g, "<").replace(/\&gt\;/, ">").replace(/\&amp;/g, "&");
  jQuery("#" + id).remove();
  var originalItem = jQuery("#AtD_txa_" + id);
  originalItem.attr("id", id).val(content).show().trigger('input');
  options.link.html(options.before).css({"color":"#b3b2b3"});
  scope.model = content;
  scope.$apply();
  AtD.isChecking = false;
};

AtD.checkTextAreaCrossAJAX = function(scope, id, linkId, after) {
  if (AtD.isChecking) return;
  AtD.isChecking = true;
  AtD._checkTextArea(scope, id, AtD.checkCrossAJAX, linkId, after);
};

AtD.checkTextArea = function(id, linkId, after) {
  if (AtD.api_key === undefined || AtD.rpc === undefined) {
    alert("You need to set AtD.api_key and AtD.rpc to use AtD.checkTextArea()");
  } else {
    AtD._checkTextArea(id, AtD.check, linkId, after);
  }
};

AtD._checkTextArea = function(scope, id, commChannel, linkId, after) {
  var container = jQuery("#" + id);

  // No textarea? Then make one.
  if (AtD.textareas[id] === undefined) {
    var properties = {};
    var styles = ["color", "font-size", "font-family", "border-top-width", "border-bottom-width", "border-left-width", "border-right-width", "border-top-style", "border-bottom-style", "border-left-style", "border-right-style", "border-top-color", "border-bottom-color", "border-left-color", "border-right-color", "border-radius", "text-align", "margin-top", "margin-bottom", "margin-left", "margin-right", "height", "line-height", "letter-spacing", "left", "right", "top", "bottom", "position", "padding-left", "padding-right", "padding-top", "padding-bottom", "resize"];

    // Copy the styles we care about.
    for (var prop in styles) {
      if (container.css(styles[prop]) !== "") {
        properties[styles[prop]] = container.css(styles[prop]);
      }
    }

    // Hydrate a new textarea.
    AtD.textareas[id] = {
      node: container,
      height: container.height(),
      link: jQuery("#" + linkId),
      before: jQuery("#" + linkId).html(),
      after: after,
      style: properties
    };
  }

  // Store values to check.
  var options = AtD.textareas[id];
  var quickHtml = options.link.html();

  // Tell UI we're running the spell checker.
  options.link.html("checking...").css({"color":"#000000"});

  // Check state via link values.
  if (quickHtml !== options.before) {
    AtD.restoreTextArea(id, scope);
    jQuery("#" + id).show();
    return;
  }

  options.link.html(options.after);

  var disableClick = function() {
    return false;
  };
  options.link.click(disableClick);
  var div = void 0;
  var hidden = jQuery("<input type=\"hidden\" />").attr("id", "AtD_sync_").val(container.val());
  var name = container.attr("name");

  var onContentChange = function() {
    var strip = function(html) {
       var tmp = document.createElement("DIV");
       tmp.innerHTML = html;
       return tmp.textContent || tmp.innerText || "";
    };
    var htmlContent = strip(jQuery("#" + id).html());
    htmlContent = htmlContent.replace(/\&lt\;/g, "<").replace(/\&gt\;/, ">").replace(/\&amp;/g, "&");
    var originalItem = jQuery("#AtD_txa_" + id);
    scope.model = htmlContent;
    scope.$apply();
    originalItem.val(htmlContent).trigger('input');
    originalItem.trigger('change');
  };

  // Copy verbiage from textarea.
  var afterTextForSpellchecker = container.val().replace(/\&/g, '&amp;');
  if (navigator.appName === "Microsoft Internet Explorer") {
    afterTextForSpellchecker =  container.val().replace(/\&/g, '&amp;').replace(/[\n\r\f]/gm, '<BR class="atd_remove_me">');
  }

  // Update textarea, then hide it.
  container.attr("id", "AtD_txa_" + id).after();
  jQuery("#AtD_txa_" + id).hide();

  // Create a new DIV for the editable area, then bind events and styles.
  jQuery("#AtD_txa_" + id).after('<div id="' + id + '">' + afterTextForSpellchecker + '</div>');

  div = jQuery("#" + id).on('blur', onContentChange)
                        .attr("style", options.node.attr("style"))
                        .attr("class", options.node.attr("class"))
                        .css({"overflow": "auto" });
  if (navigator.appName === "Microsoft Internet Explorer") {
    options['style']['font-size'] = undefined;
    options['style']['font-family'] = undefined;
  } else {
    div.css({ "white-space": "pre-wrap", "outline": "none" })
       .attr("contenteditable", "true")
       .attr("spellcheck", false);
  }

  div.keydown(function(event) {

    // ESC ket to exit Spell Check Mode.
    if (event.keyCode == 27) {
      AtD.restoreTextArea(id, scope);
      jQuery("#" + id).show();
      return;
    }

    // Disallow carriage returns.
    return event.keyCode !== 13;
  });

  // Attach temporary hidden input to hold verbiage.
  hidden.attr("name", name);
  div.after(hidden);

  // Synchronize content.
  var SyncInProgress = false;
  var syncContents = function() {
    if (SyncInProgress) return;
    SyncInProgress = true;
    setTimeout((function() {
      onContentChange();
      var content = void 0;
      if (navigator.appName === "Microsoft Internet Explorer") {
        content = div.html().replace(/<BR.*?class.*?atd_remove_me.*?>/g, "\n");
      } else {
        content = div.html();
      }
      var temp = jQuery("<div></div>").html(content);
      AtD.core.removeWords(temp);
      hidden.val(temp.html().replace(/\&lt\;/g, "<").replace(/\&gt\;/, ">").replace(/\&amp;/g, "&"));
      SyncInProgress = false;
    }), 1);
  };

  // Bind events to sync.
  div.keypress(syncContents)
     .mousemove(syncContents)
     .mouseout(syncContents)
     .css(options.style)
     .height(options.height);

  // Call the Spell Check service.
  commChannel(id, {
    ready: function(errorCount) {
      options.link.html(after).css({"color":"#ee4036"});
      options.link.unbind("click", disableClick);
      AtD.isChecking = false;
    },
    explain: function(url) {
      var left = (screen.width / 2) - (480 / 2);
      var top = (screen.height / 2) - (380 / 2);
      window.open(url, "", "width=480,height=380,toolbar=0,status=0,resizable=0,location=0,menuBar=0,left=" + left + ",top=" + top).focus();
    },
    success: function(errorCount) {
      AtD.restoreTextArea(id, scope);
    },
    error: function(reason) {
      var errorMessage = AtD.getLang("message_server_error_short", "There was an error communicating with the spell checking service.");
      options.link.unbind("click", disableClick);
      if (reason) errorMessage += "\n\n" + reason;
      alert(errorMessage);
      AtD.restoreTextArea(id, scope);
    },
    editSelection: function(element) {
      var text = prompt(AtD.getLang("dialog_replace_selection", "Replace selection with:"), element.text());
      if (text) {
        jQuery(element).html(text);
        AtD.core.removeParent(element);
      }
    }
  });

  // Finally, display the new contenteditable div.
  jQuery("#" + id).show();
};

jQuery.fn.addProofreader = function(options) {
  var opts, parent;
  this.id = 0;
  parent = this;
  opts = jQuery.extend({}, jQuery.fn.addProofreader.defaults, options);
  return this.each(function() {
    var $this, id, node;
    $this = jQuery(this);
    if ($this.css("display") === "none") {
      return;
    }
    if ($this.attr("id").length === 0) {
      $this.attr("id", "AtD_" + parent.id++);
    }
    id = $this.attr("id");
    node = jQuery("<span></span>");
    node.attr("id", "AtD_" + parent.id++);
    node.html(opts.proofread_content);
    node.click(function(event) {
      if (AtD.current_id !== undefined && AtD.current_id !== id) {
        AtD.restoreTextArea(AtD.current_id);
      }
      if (AtD.api_key !== "" && AtD.rpc !== "") {
        AtD.checkTextArea(id, node.attr("id"), opts.edit_text_content);
      } else {
        AtD.checkTextAreaCrossAJAX(id, node.attr("id"), opts.edit_text_content);
      }
      AtD.current_id = id;
    });
    $this.wrap("<div></div>");
    $this.parents("form").submit(function(event) {
      AtD.restoreTextArea(id);
    });
    $this.before(node);
  });
};

jQuery.fn.addProofreader.defaults = {
  edit_text_content: "<span class=\"AtD_edit_button\"></span>",
  proofread_content: "<span class=\"AtD_proofread_button\"></span>"
};
})(jQuery, csshttprequest);

exports = module.exports = AtD;
exports.name = "AtD";