var JsSearch = (function () {
    // removes the given entity
    (function () {
        Array.prototype.clean = function(deleteValue) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] == deleteValue) {
                    this.splice(i, 1);
                    i--;
                }
            }

            return this;
        }
    })();

    // shim for forEach
    (function () {
        if (!Array.prototype.forEach){
            Array.prototype.forEach = function(fun /*, thisp*/){
                var len = this.length;
                if (typeof fun != "function") throw new TypeError();

                var thisp = arguments[1];
                for (var i = 0; i < len; i++){
                    if (i in this) fun.call(thisp, this[i], i, this);
                }
            };
        }
    })();

    // shim for getElementsByClassName
    (function () {
        if(!document.getElementsByClassName){ //IE 8 doesnt support getElementsByClassName
            document.getElementsByClassName = Element.prototype.getElementsByClassName = function(class_names) {
                // Turn input in a string, prefix space for later space-dot substitution
                class_names = (' ' + class_names)
                // Escape special characters
                .replace(/[~!@$%^&*()_+\-=,./';:"?><[\]{}|`#]/g, '\\$&')
                // Normalize whitespace, right-trim
                .replace(/\s*(\s|$)/g, '$1')
                // Replace spaces with dots for querySelectorAll
                .replace(/\s/g, '.');
                return this.querySelectorAll(class_names);
            };
        }
        //'
    })();

    // removes a class
    (function () {
        if(!HTMLElement.prototype.removeClass){
            HTMLElement.prototype.removeClass = function(remove) {
                var newClassName = "";
                var i;
                var classes = this.className.split(" ");
                for(i = 0; i < classes.length; i++)
                    if(classes[i] !== remove)
                        newClassName += classes[i] + " ";
                this.className = newClassName;
            }
        }
    })();

    // shim for CustomEvent for IE 9 & 10
    (function () {
        function CustomEvent ( event, params ) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent( 'CustomEvent' );
            evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
            return evt;
        };

        CustomEvent.prototype = window.CustomEvent.prototype;

        window.CustomEvent = CustomEvent;
    })();

    // enumeration for Html Attributes
    var HtmlAttributes = {
        "id" : "id",
        "class" : "class",
        "style" : "style",
        "expanded" : "expanded",
        "collapsed" : "collapsed"
    };

    // enumeration for Html Elements
    var HtmlElements = {
        "listItem" : "li",
        "orderedList": "ol"
    };

    // enumeration for Events
    var Events = {
        "listItemClicked":"listItemClicked"
    };

    // provides unique IDs for each element that needs an ID
    var ID = 0;
    var getUniqueId = function () {
        return "id" + ++ID;
    }

    //----------------------- Search Class --------------------------
    var Search = function (strToSearchFor, sources, lowCoincidenceLevel, maxResultsToShow) {
        if(arguments.length < 2)
            throw new Error([
                "Search constructor",
                "Insufficient parameters, usage: " +
                "Search(strToSearchFor, sources, optLowCoincidenceLevel, optMaxResultsToShow)"
            ]);

        this.keywords = strToSearchFor.toLowerCase().split(" ").clean(" ");
        this.sources = [];
        for (var i = 0; i < sources.length; i++) {
            this.sources.push( new Source(sources[i]) );
        };
        //sources.forEach( function (obj) { });
        this.lowCoincidenceLevel = lowCoincidenceLevel || 5;
        this.maxResultsToShow = maxResultsToShow || 10;
        this.results = [];

        var self = this;

        self.getResults = function () {
            var _result = new Array();
            self.sources.forEach(function (s){
                s.calcCoincidenceLevel(self.keywords);
                if (s.keywordsMatch != 0) _result.push(s);
            });

            _result.sort( function (w1, w2) {
                if(w1.keywordsMatch != w2.keywordsMatch)
                    return w2.keywordsMatch - w1.keywordsMatch;
                else
                    return w2.coincidenceLevel - w1.coincidenceLevel
            });

            return _result;
        }
    }

    //----------------------- Source Class ---------------------------
    var Source = function (htmlObj) {
        var self = this;

        if(htmlObj.id) {
            this.id = htmlObj.id;
        } else {
            this.id = getUniqueId();
            htmlObj.setAttribute("id", self.id)
        }

        this.words = {};
        this.wordCount = 0;
        this.coincidenceLevel = 0;
        this.keywordsMatch = 0.0;

        var self = this;

        var txtCont = htmlObj.textContent;
        var txtCont = txtCont.
            replace(/[&\/\\#\n,+()$~%.'":*?<>{}|;=!-]/g, " ").
            replace(/toString/gi, " ").
            replace(/constructor/gi, " ").
            toLowerCase();
        txtCont.split(" ").clean("").forEach( function (word) {
            var w = word.trim();
            if(self.words[w]) self.words[w].increaseFrequency();
            else self.words[w] = new Word(w);

            self.wordCount++;
        });
    }

    Source.prototype = {

        constructor: Search,

        getWord: function (word) {
            return self.words[word];
        },

        calcCoincidenceLevel: function (searchWords) {
            //coincidence level
            var cl = 0.0;
            var wordMatch = 0;
            var self = this;

            searchWords.forEach( function (srcWord) {
                var sw = srcWord.trim();
                if(self.words[sw]){
                    cl += parseFloat(self.words[sw].frequency / self.wordCount)
                    wordMatch++;
                }
            });

            var cl = cl/searchWords.length*100.0;
            self.coincidenceLevel = cl;
            self.keywordsMatch = parseFloat(wordMatch/searchWords.length*100);

            return cl;
        }
    }

    //----------------------- Word Class -------------------------
    var Word = function (text){
        this._text = text;
        this.frequency = 1;

        var self = this;
    }

    Word.prototype = {

        constructor: Word,

        getText: function () {
            return this._text;
        },

        increaseFrequency: function (){
            var self = this;
            self.frequency++;
        }
    }

    //------------------------- ListItem Class -----------------------------//
    var ListItem = function (shorceHtmlObj, id) {
        this.id = id || getUniqueId();
        this.source = shorceHtmlObj.cloneNode(true);
        this.isExpanded = false;
        this.isCollapsed = true;
        this.disableEvents = false;
        this.htmlObj = document.createElement(HtmlElements.listItem);

    }

    ListItem.prototype = {

        constructor: ListItem,

        isRendered: function () {
            return document.getElementById(this.id) != null
        },

        toHtmlObj: function () {
            if(!this.isRendered()) {
                this.htmlObj.appendChild(this.source);
                this.htmlObj.setAttribute("class", "");
                var self = this;

                if(!this.disableEvents){
                    this.htmlObj.onclick = function () {
                        var evt = new CustomEvent(Events.listItemClicked);
                        evt.initCustomEvent(Events.listItemClicked, true, true, self);
                        window.dispatchEvent(evt);
                    }
                }

                return this.htmlObj;
            }

            return document.getElementById(this.id);
        },

        render: function () {
            document.body.appendChild(function () { return this.toHtmlObj() });
        },

        collapse: function (o) {
            this.isCollapsed = true;
            this.isExpanded = false;

            var li = (this.isRendered() == true) ? document.getElementById(this.id) : this.htmlObj;
            li.removeClass("resultsClick");
            li.setAttribute(HtmlAttributes.expanded, false);
            li.setAttribute(HtmlAttributes.collapsed, true);
        },

        expand: function (o) {
            this.isExpanded = true;
            this.isCollapsed = false;

            var li = (this.isRendered() == true) ? document.getElementById(this.id) : this.htmlObj;
            var height = li.firstChild.offsetHeight;
            li.setAttribute(HtmlAttributes.style, "max-height:"+height+"px !important");
            li.classList.add("resultsClick");
            li.setAttribute(HtmlAttributes.expanded, true);
            li.setAttribute(HtmlAttributes.collapsed, false);
        },

        scrollToTop: function (o) {
            var li = (this.isRendered() == true) ? document.getElementById(this.id) : this.htmlObj;

            var rect = li.getBoundingClientRect();
            window.scrollTo(rect.left, rect.top);
        },

        getText: function () {
            var li = (this.isRendered() == true) ? document.getElementById(this.id) : this.htmlObj;
            return li.textContent;
        }
    };

    //--------------------------- List Class -------------------------------//
    var List = function (ListItems, isOrdered, id) {
        this.id = id || getUniqueId();
        this.listItems = ListItems;
        this.count = ListItems.length;
        this.isExpanded = false;
        this.isRendered = false;
        this.isOrderedList = isOrdered;
        this.hasControls = false;
        this.htmlObj = (isOrdered == true) ? document.createElement("ol") : document.createElement("ul");
        this.htmlObj.setAttribute(HtmlAttributes.id, this.id);
        this.selectedItems = [];

        var self = this;

        // following event listener function could be put outside of this class in order
        // to set different behaviour to ListItems of the List
        window.addEventListener(Events.listItemClicked, function(evt) {
            listItem = evt.detail;
            self.collapseAll();
            self.expandById(listItem.id);
            self.selectedItems = [];
            self.selectedItems.push(listItem);
        }, false);
    }

    List.prototype = {

        constructor: List,

        toHtmlObj: function () {
            var self = this;

            if(this.hasControls){
                var container = document.createElement("span");
                var button = document.createElement("input");
                button.setAttribute("type","button");

                var butCollapse = button.cloneNode(true);
                butCollapse.value = "Collapse all";
                butCollapse.onclick = function () {
                    self.collapseAll();
                    self.selectedItems = [];
                }

                var butExpand = button.cloneNode(true);
                butExpand.value = "Expand all";
                butExpand.onclick = function () {
                    self.expandAll();
                    self.selectedItems = self.listItems;
                }

                var butCopyText = button.cloneNode(true);
                butCopyText.value = "Copy selected code";
                butCopyText.setAttribute(HtmlAttributes.id, "copy-button");
                butCopyText.onclick = function () {
                    var textToCopy = self.getSelectedItemsText();
                    if(textToCopy == "") alert("please select code before copy")
                    else //copy code
                    console.log(textToCopy);
                }

                container.appendChild(butCollapse);
                container.appendChild(butExpand);
                container.appendChild(butCopyText);
                //var li = document.createElement("li");
                //li.appendChild(container);
                self.htmlObj.appendChild(container);
            }


            this.listItems.forEach( function (listItem) {
                var li = listItem.toHtmlObj();
                self.htmlObj.appendChild(li);
            });

            return this.htmlObj;
        },

        render: function (containerObj) {
            var htmlObj = this.toHtmlObj();

            if(containerObj) containerObj.appendChild(htmlObj);
            else document.body.appendChild(htmlObj);
        },

        collapseAll: function () {
            this.listItems.forEach( function (listItem) {
                if(listItem.isExpanded) listItem.collapse();
            });
        },

        expandAll: function () {
            this.listItems.forEach( function (listItem) {
                if(listItem.isCollapsed) listItem.expand();
            });
        },

        collapseById: function (idToCollapse) {
            this.listItems.forEach( function (listItem) {
                if(listItem.id == idToCollapse) listItem.collapse();
            });
        },

        expandById: function (idToExpand) {
            this.listItems.forEach( function (listItem) {
                if(listItem.id == idToExpand) listItem.expand();
            });
        },

        scrollToTopByID: function (idToScrollTo){
            this.listItems.forEach( function (listItem) {
                if(listItem.id == idToScrollTo) listItem.scrollToTop();
            });
        },

        addListItem: function (ListItem) {
            this.listItems.push(ListItem);
        },

        getSelectedItemsText: function () {
            var text = "";
            this.selectedItems.forEach(function (item) {
                text += "\n";
                text += item.getText();
            });

            return text;
        }
    };

    // ---------------------------- Result CLass ------------------------//
    var Result = function (sources, resultContainer, id) {
        this.id = id || getUniqueId();
        this.sources = sources;
        this.container = resultContainer;
        this.messages = [];
    }

    Result.prototype = {

        constructor : Result,

        addMessage: function (msg) {
            this.messages.push(msg);
        },

        clean: function () {
            while (this.container.firstChild)
                this.container.removeChild(this.container.firstChild);
            this.container.innerHtml = "";
            this.container.textContent = "";
        },

        render: function () {
            var list = new List([], true, this.id);
            list.hasControls = true;

            this.messages.forEach( function (message) {
                message = (typeof message == "string")? message : document.createElement("span").textContent = message;
                var listItem = new ListItem(message);
                list.addListItem(listItem);
            });

            this.sources.forEach( function (source) {
                var s = document.getElementById(source.id).cloneNode(true);
                s.setAttribute("class", "prettyprint linenums ");
                var listItem = new ListItem(s);
                list.addListItem(listItem);
            });

            var listAsHtml = list.toHtmlObj();
            this.container.appendChild(listAsHtml);
        }
    };

    //------------------------ Controls Class ---------------------------//
    var Controls = function () {

    }

    return {
        Search: Search,
        Result: Result
    }
})();
