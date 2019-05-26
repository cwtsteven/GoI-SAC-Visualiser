define(function(require) {

	var Node = require('node');
	var CompData = require('token').CompData();
	var RewriteFlag = require('token').RewriteFlag();
	var BoxWrapper = require('box-wrapper');
	var Const = require('nodes/const');
	var Link = require('link');
	var Weak = require('nodes/weak');

	class Set extends Node {

		constructor() {
			super(null, "<:=", "indianred1");
		}
		
		transition(token, link) {
			if (link.to == this.key) {
				var nextLink = this.findLinksOutOf("e")[0];
				token.dataStack.push(CompData.PROMPT);
				return nextLink;
			}
			else if (link.from == this.key) {
				if (link.fromPort == "e") {
					var nextLink = this.findLinksOutOf("w")[0];
					//token.dataStack.pop();
					token.dataStack.push(CompData.PROMPT);
					token.forward = true; 
					return nextLink;
				}
				else if (link.fromPort == "w") {
					if (token.dataStack[token.dataStack.length-3] == CompData.PROMPT) {
						var data = token.dataStack.pop();
						var new_v = token.dataStack.pop();
						token.dataStack.pop();
						token.dataStack.push([CompData.UNIT,CompData.EMPTY]);

						token.rewriteFlag = RewriteFlag.F_ASSIGN + data[1] +';'+ new_v[0];
						return this.findLinksInto(null)[0];
					}
				}
			}
		}

		rewrite(token, nextLink) { 
			if (token.rewriteFlag.substring(0,3) == RewriteFlag.F_ASSIGN && nextLink.to == this.key) {
				var string = token.rewriteFlag.substring(3,token.rewriteFlag.length);
				var s = string.split(";");
				var key = s[0];
				var data = s[1];
				token.rewriteFlag = RewriteFlag.EMPTY;

				
				var weak1 = new Weak().addToGroup(this.group);
				this.findLinksOutOf("w")[0].changeFrom(weak1.key, "n");

				var mod = this.graph.findNodeByKey(key);
				var weak2 = new Weak().addToGroup(this.group);
				//mod.findLinksOutOf('e')[0].changeFrom(weak2.key, 'n');
				this.findLinksOutOf("e")[0].changeFrom(weak2.key, "n");
				this.graph.findNodeByKey(mod.findLinksOutOf('w')[0].to).name = data;
				this.graph.findNodeByKey(mod.findLinksOutOf('w')[0].to).text = data;

				var data = token.dataStack.last();
				var wrapper = BoxWrapper.create().addToGroup(this.group);
				var con = new Const(data[0]).addToGroup(wrapper.box);
				new Link(wrapper.prin.key, con.key, "n", "s").addToGroup(wrapper);
				this.findLinksInto(null)[0].changeTo(wrapper.prin.key, "s");
				this.delete();
				
				token.rewrite = true;
				return nextLink;
			}

			else if (token.rewriteFlag == RewriteFlag.EMPTY) {
				token.rewrite = false;
				return nextLink;
			}
		}

		copy() {
			return new Set();
		}
	}

	return Set;
});