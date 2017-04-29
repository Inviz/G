(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
// This is for building jot for use in browsers. Expose
// the library in a global 'jot' object.
global.jot = require("../jot")
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../jot":3}],2:[function(require,module,exports){
// Construct JOT operations by performing a diff on
// standard data types.

var deepEqual = require("deep-equal");

var jot = require("./index.js");
var sequences = require("./sequences.js");

function diff(a, b, options) {
	// Compares two JSON-able data instances and returns
	// information about the difference:
	//
	// {
	//   op:   a JOT operation representing the change from a to b
	//   pct:  a number from 0 to 1 representing the proportion
	//         of content that is different
	//   size: an integer representing the approximate size of the
	//         content in characters, which is used for weighting
	// }

	// Return fast if the objects are equal. This is muuuuuch
	// faster than doing our stuff recursively.

	if (deepEqual(a, b, { strict: true })) {
		return {
			op: new jot.NO_OP(),
			pct: 0.0,
			size: JSON.stringify(a).length
		};
	}

	// Run the diff method appropriate for the pair of data types.

	function typename(val) {
		if (val === null)
			return "null";
		if (typeof val == "string" || typeof val == "number" || typeof val == "boolean")
			return typeof val;
		if (Array.isArray(val))
			return "array";
		return "object";
	}

	var ta = typename(a);
	var tb = typename(b);
	
	if (ta == "string" && tb == "string")
		return diff_strings(a, b, options);

	if (ta == "array" && tb == "array")
		return diff_arrays(a, b, options);
	
	if (ta == "object" && tb == "object")
		return diff_objects(a, b, options);

	// If the data types of the two values are different,
	// or if we don't recognize the data type (which is
	// not good), then only an atomic SET operation is possible.
	return {
		op: jot.SET(b),
		pct: 1.0,
		size: (JSON.stringify(a)+JSON.stringify(b)).length / 2
	}
}

exports.diff = function(a, b, options) {
	// Ensure options are defined.
	options = options || { };

	// Call diff() and just return the operation.
	return diff(a, b, options).op;
}

function diff_strings(a, b, options) {
	// Use the 'diff' package to compare two strings and convert
	// the output to a jot.LIST.
	var diff = require("diff");
	
	var method = "Chars";
	if (options.words)
		method = "Words";
	if (options.lines)
		method = "Lines";
	if (options.sentences)
		method = "Sentences";
	
	var total_content = 0;
	var changed_content = 0;

	var offset = 0;
	var hunks = diff["diff" + method](a, b)
		.map(function(change) {
			// Increment counter of total characters encountered.
			total_content += change.value.length;
			
			if (change.added || change.removed) {
				// Increment counter of changed characters.
				changed_content += change.value.length;

				// Create a SPLICE operation for this change.
				var old_value = "", new_value = "";
				if (change.removed) old_value = change.value;
				if (change.added) new_value = change.value;
				var ret = { offset: offset, old_value: old_value, new_value: new_value };
				offset = 0;
				return ret;
			} else {
				// Advance character position index. Don't generate a hunk here.
				offset += change.value.length;
				return null;
			}
		})
		.filter(function(item) { return item != null; });

	// Form the SPLICE operation.
	var op = jot.SPLICE(hunks).simplify();

	// If the change is a single operation that replaces the whole content
	// of the string, use a SET operation rather than a SPLICE operation.
	if (op instanceof sequences.SPLICE && op.hunks.length == 1 
		&& op.hunks[0].old_value == a && op.hunks[0].new_value == b) {
		return {
			op: jot.SET(b),
			pct: 1.0,
			size: total_content
		};
	}

	return {
		op: op,
		pct: (changed_content+1)/(total_content+1), // avoid divizion by zero
		size: total_content
	};
}

function diff_arrays(a, b, options) {
	// Use the 'generic-diff' package to compare two arrays,
	// but using a custom equality function. This gives us
	// a relation between the elements in the arrays. Then
	// we can compute the operations for the diffs for the
	// elements that are lined up (and INS/DEL operations
	// for elements that are added/removed).
	
	var generic_diff = require("generic-diff");

	// We'll run generic_diff over an array of indices
	// into a and b, rather than on the elements themselves.
	var ai = a.map(function(item, i) { return i });
	var bi = b.map(function(item, i) { return i });

	var ops = [ ];
	var total_content = 0;
	var changed_content = 0;
	var pos = 0;

	function do_diff(ai, bi, level) {
		// Run generic-diff using a custom equality function that
		// treats two things as equal if their difference percent
		// is less than or equal to level.
		//
		// We get back a sequence of add/remove/equal operations.
		// Merge these into changed/same hunks.

		var hunks = [];
		var a_index = 0;
		var b_index = 0;
		generic_diff(
			ai, bi,
			function(ai, bi) { return diff(a[ai], b[bi], options).pct <= level; }
			).forEach(function(change) {
				if (!change.removed && !change.added) {
					// Same.
					if (a_index+change.items.length > ai.length) throw "out of range";
					if (b_index+change.items.length > bi.length) throw "out of range";
					hunks.push({ type: 'equal', ai: ai.slice(a_index, a_index+change.items.length), bi: bi.slice(b_index, b_index+change.items.length) })
					a_index += change.items.length;
					b_index += change.items.length;
				} else {
					if (hunks.length == 0 || hunks[hunks.length-1].type == 'equal')
						hunks.push({ type: 'unequal', ai: [], bi: [] })
					if (change.added) {
						// Added.
						hunks[hunks.length-1].bi = hunks[hunks.length-1].bi.concat(change.items);
						b_index += change.items.length;
					} else if (change.removed) {
						// Removed.
						hunks[hunks.length-1].ai = hunks[hunks.length-1].ai.concat(change.items);
						a_index += change.items.length;
					}
				}
			});

		// Process each hunk.
		hunks.forEach(function(hunk) {
			//console.log(level, hunk.type, hunk.ai.map(function(i) { return a[i]; }), hunk.bi.map(function(i) { return b[i]; }));

			if (level < 1 && hunk.ai.length > 0 && hunk.bi.length > 0
				&& (level > 0 || hunk.type == "unequal")) {
				// Recurse at a less strict comparison level to
				// tease out more correspondences. We do this both
				// for 'equal' and 'unequal' hunks because even for
				// equal the pairs may not really correspond when
				// level > 0.
				do_diff(
					hunk.ai,
					hunk.bi,
					(level+1.1)/2);
				return;
			}

			if (hunk.ai.length != hunk.bi.length) {
				// The items aren't in correspondence, so we'll just return
				// a whole SPLICE from the left subsequence to the right
				// subsequence.
				var op = jot.SPLICE(
					pos,
					hunk.ai.map(function(i) { return a[i]; }),
					hunk.bi.map(function(i) { return b[i]; }));
				ops.push(op);
				//console.log(op);

				// Increment counters.
				var dd = (JSON.stringify(op.old_value) + JSON.stringify(op.new_value)).length/2;
				total_content += dd;
				changed_content += dd;

			} else {
				// The items in the arrays are in correspondence.
				// They may not be identical, however, if level > 0.
				for (var i = 0; i < hunk.ai.length; i++) {
					var d = diff(a[hunk.ai[i]], b[hunk.bi[i]], options);

					// Add an operation.
					if (!d.op.isNoOp())
						ops.push(jot.APPLY(hunk.bi[i], d.op));

					// Increment counters.
					total_content += d.size;
					changed_content += d.size*d.pct;
				}
			}

			pos += hunk.bi.length;
		});
	}

	// Go.

	do_diff(ai, bi, 0);

	return {
		op: jot.LIST(ops).simplify(),
		pct: (changed_content+1)/(total_content+1), // avoid divizion by zero
		size: total_content
	};		
}

function diff_objects(a, b, options) {
	// Compare two objects.

	var ops = [ ];
	var total_content = 0;
	var changed_content = 0;
	
	// If a key exists in both objects, then assume the key
	// has not been renamed.
	for (var key in a) {
		if (key in b) {
			// Compute diff.
			d = diff(a[key], b[key], options);

			// Add operation if there were any changes.
			if (!d.op.isNoOp())
				ops.push(jot.APPLY(key, d.op));

			// Increment counters.
			total_content += d.size;
			changed_content += d.size*d.pct;
		}
	}

	// Do comparisons between all pairs of unmatched
	// keys to see what best lines up with what. Don't
	// store pairs with nothing in common.
	var pairs = [ ];
	for (var key1 in a) {
		if (key1 in b) continue;
		for (var key2 in b) {
			if (key2 in a) continue;
			var d = diff(a[key1], b[key2], options);
			if (d.pct == 1) continue;
			pairs.push({
				a_key: key1,
				b_key: key2,
				diff: d
			});
		}
	}

	// Sort the pairs to choose the best matches first.
	// (This is a greedy approach. May not be optimal.)
	var used_a = { };
	var used_b = { };
	pairs.sort(function(a,b) { return ((a.diff.pct*a.diff.size) - (b.diff.pct*b.diff.size)); })
	pairs.forEach(function(item) {
		// Have we already generated an operation renaming
		// the key in a or renaming something to the key in b?
		// If so, this pair can't be used.
		if (item.a_key in used_a) return;
		if (item.b_key in used_b) return;
		used_a[item.a_key] = 1;
		used_b[item.b_key] = 1;

		// Use this pair.
		ops.push(jot.REN(item.a_key, item.b_key));
		if (!item.diff.op.isNoOp())
			ops.push(jot.APPLY(item.b_key, item.diff.op));

		// Increment counters.
		total_content += item.diff.size;
		changed_content += item.diff.size*item.diff.pct;
	})

	// Delete/create any keys that didn't match up.
	for (var key in a) {
		if (key in b || key in used_a) continue;
		ops.push(jot.REM(key));
	}
	for (var key in b) {
		if (key in a || key in used_b) continue;
		ops.push(jot.PUT(key, b[key]));
	}

	return {
		op: jot.LIST(ops).simplify(),
		pct: (changed_content+1)/(total_content+1), // avoid divizion by zero
		size: total_content
	};
}


},{"./index.js":3,"./sequences.js":6,"deep-equal":8,"diff":20,"generic-diff":26}],3:[function(require,module,exports){
/* Base functions for the operational transformation library. */

var util = require('util');

// Must define this ahead of any imports below so that this constructor
// is available to the operation classes.
exports.BaseOperation = function() {
}
exports.add_op = function(constructor, module, opname, constructor_args) {
	// utility.
	constructor.prototype.type = [module.module_name, opname];
	constructor.prototype.constructor_args = constructor_args;
	if (!('op_map' in module))
		module['op_map'] = { };
	module['op_map'][opname] = constructor;
}


// Imports.
var values = require("./values.js");
var sequences = require("./sequences.js");
var objects = require("./objects.js");
var meta = require("./meta.js");

// Define aliases.
function new_op(op_class, args) {
	var op = Object.create(op_class.prototype);
	op_class.apply(op, args);
	return op;
}
exports.NO_OP = function() { return new_op(values.NO_OP, arguments) };
exports.SET = function() { return new_op(values.SET, arguments) };
exports.MATH = function() { return new_op(values.MATH, arguments) };
exports.PATCH = function() { return new_op(sequences.PATCH, arguments) };
exports.SPLICE = function() { return new_op(sequences.SPLICE, arguments) };
exports.MAP = function() { return new_op(sequences.MAP, arguments) };
exports.PUT = function() { return new_op(objects.PUT, arguments) };
exports.REN = function() { return new_op(objects.REN, arguments) };
exports.REM = function() { return new_op(objects.REM, arguments) };
exports.LIST = function() { return new_op(meta.LIST, arguments) };
exports.APPLY = function(pos_or_key) {
	if (typeof pos_or_key == "number")
		return new_op(sequences.APPLY, arguments);
	if (typeof pos_or_key == "string")
		return new_op(objects.APPLY, arguments);
	throw "Invalid Argument";
};
exports.UNAPPLY = function(op, pos_or_key) {
	if (typeof pos_or_key == "number"
		&& op instanceof sequences.APPLY
		&& op.pos == pos_or_key)
		return op.op;
	if (typeof pos_or_key == "string"
		&& op instanceof objects.APPLY
		&& pos_or_key in op.ops)
		return op.ops[pos_or_key];
	if (op instanceof meta.LIST)
		return new meta.LIST(op.ops.map(function(op) {
			return exports.UNAPPLY(op, pos_or_key)
		}));
	return new values.NO_OP();
};

exports.diff = require('./diff.js').diff;

/////////////////////////////////////////////////////////////////////

exports.BaseOperation.prototype.isNoOp = function() {
	return this instanceof values.NO_OP;
}

exports.BaseOperation.prototype.toJSON = function() {
	var repr = { };
	repr['_type'] = { 'module': this.type[0], 'class': this.type[1] };
	var keys = Object.keys(this);
	for (var i = 0; i < keys.length; i++) {
		var value = this[keys[i]];
		var v;
		if (value instanceof exports.BaseOperation) {
			v = value.toJSON();
        }
		else if (value === objects.MISSING) {
			repr[keys[i] + "_missing"] = true;
			continue;
        }
        else if (keys[i] === 'ops' && Array.isArray(value)) {
            v = value.map(function(ki) {
                return ki.toJSON();
            });
        }
        else if (keys[i] === 'ops' && typeof value === "object") {
            v = { };
            for (var key in value)
            	v[key] = value[key].toJSON();
        }
		else if (typeof value !== 'undefined') {
			v = value;
        }
		else {
			continue;
        }
		repr[keys[i]] = v
	}
	return repr;
}

exports.opFromJSON = function(obj, op_map) {
	// Create a default mapping from encoded types to constructors
	// allowing all operations to be deserialized.
	if (!op_map) {
		op_map = { };

		function extend_op_map(module) {
			op_map[module.module_name] = { };
			for (var key in module.op_map)
				op_map[module.module_name][key] = module.op_map[key];
		}

		extend_op_map(values);
		extend_op_map(sequences);
		extend_op_map(objects);
		extend_op_map(meta);
	}

	// Sanity check.
	if (!('_type' in obj)) throw "Not an operation.";

	// Reconstruct.
	var constructor = op_map[obj._type.module][obj._type.class];
	var args = constructor.prototype.constructor_args.map(function(item) {
		var value = obj[item];

		if (obj[item + "_missing"]) {
			// Put "missing" values back.
			value = objects.MISSING;

		} if (value !== null && typeof value == 'object' && '_type' in value) {
			// Value is an operation.
			return exports.opFromJSON(value);
        
        } else if (item === 'ops' && Array.isArray(value)) {
        	// Value is an array of operations.
            value = value.map(function(op) {
                return exports.opFromJSON(op);
            });

        } else if (item === 'ops' && typeof value === "object") {
        	// Value is a mapping array of operations.
        	var newvalue = { };
        	for (var key in value)
        		newvalue[key] = exports.opFromJSON(value[key]);
        	value = newvalue;
        
        } else {
        	// Value is just a raw JSON value.
        }
		return value;
	});
	
	var op = Object.create(constructor.prototype);
	constructor.apply(op, args);
	return op;
}

exports.BaseOperation.prototype.serialize = function() {
	return JSON.stringify(this.toJSON());
}
exports.deserialize = function(op_json) {
	return exports.opFromJSON(JSON.parse(op_json));
}

exports.BaseOperation.prototype.compose = function(other) {
	// A NO_OP composed with anything just gives the other thing.
	if (this instanceof values.NO_OP)
		return other;

	// Composing with a NO_OP does nothing.
	if (other instanceof values.NO_OP)
		return this;

	// Composing with a SET obliterates this operation.
	if (other instanceof values.SET)
		return other;

	// Attempt an atomic composition if this defines the method.
	if (this.atomic_compose) {
		var op = this.atomic_compose(other);
		if (op != null)
			return op;
	}

	// Fall back to creating a LIST.
	return new meta.LIST([this, other]);
}

exports.BaseOperation.prototype.rebase = function(other, conflictless) {
	/* Transforms this operation so that it can be composed *after* the other
	   operation to yield the same logical effect as if it had been executed
	   in parallel (rather than in sequence). Returns null on conflict.
	   If conflictless is true, tries extra hard to resolve a conflict in a
	   sensible way but possibly by killing one operation or the other.
	   Returns the rebased version of this. */

	// Rebasing a NO_OP does nothing.
	if (this instanceof values.NO_OP)
		return this;

	// Rebasing on NO_OP leaves the operation unchanged.
	if (other instanceof values.NO_OP)
		return this;

	// Run the rebase operation in a's prototype. If a doesn't define it,
	// check b's prototype. If neither define a rebase operation, then there
	// is a conflict.
	for (var i = 0; i < ((this.rebase_functions!=null) ? this.rebase_functions.length : 0); i++) {
		if (other instanceof this.rebase_functions[i][0]) {
			var r = this.rebase_functions[i][1].call(this, other, conflictless);
			if (r != null && r[0] != null) return r[0];
		}
	}

	// Either a didn't define a rebase function for b's data type, or else
	// it returned null above. We can try running the same logic backwards on b.
	for (var i = 0; i < ((other.rebase_functions!=null) ? other.rebase_functions.length : 0); i++) {
		if (this instanceof other.rebase_functions[i][0]) {
			var r = other.rebase_functions[i][1].call(other, this, conflictless);
			if (r != null && r[1] != null) return r[1];
		}
	}

	if (conflictless) {
		// Everything can rebase against a SET in a conflictless way.
		// The SET always wins!
		if (this instanceof values.SET)
			return this;
		if (other instanceof values.SET)
			return new values.NO_OP();
	}

	// Everything case rebase against a LIST.
	if (other instanceof meta.LIST) {
		return meta.rebase(other, this, conflictless);
	}

	return null;
}

exports.createRandomOp = function(doc, context) {
	// Creates a random operation that could apply to doc. Just
	// chain off to the modules that can handle the data type.

	var modules = [];

	// The values module can handle any data type.
	modules.push(values);

	// sequences applies to strings and arrays.
	if (typeof doc === "string" || Array.isArray(doc))
		modules.push(sequences);

	// objects applies to objects (but not Array objects or null)
	else if (typeof doc === "object" && doc !== null)
		modules.push(objects);

	// the meta module only defines LIST which can also
	// be applied to any data type but gives us stack
	// overflows
	//modules.push(meta);

	return modules[Math.floor(Math.random() * modules.length)]
		.createRandomOp(doc, context);
}

function type_name(x) {
	if (typeof x == 'object') {
		if (Array.isArray(x))
			return 'array';
		return 'object';
	}
	return typeof x;
}

// Utility function to compare values for the purposes of
// setting sort orders that resolve conflicts.
exports.cmp = function(a, b) {
	// For objects.MISSING, make sure we try object identity.
	if (a === b)
		return 0;

	// objects.MISSING has a lower sort order so that it tends to get clobbered.
	if (a === objects.MISSING)
		return -1;
	if (b === objects.MISSING)
		return 1;

	// Comparing strings to numbers, numbers to objects, etc.
	// just sort based on the type name.
	if (type_name(a) != type_name(b)) {
		return exports.cmp(type_name(a), type_name(b));
	
	} else if (typeof a == "number") {
		if (a < b)
			return -1;
		if (a > b)
			return 1;
		return 0;
		
	} else if (typeof a == "string") {
		return a.localeCompare(b);
	
	} else if (Array.isArray(a)) {
		// First compare on length.
		var x = exports.cmp(a.length, b.length);
		if (x != 0) return x;

		// Same length, compare on values.
		for (var i = 0; i < a.length; i++) {
			x = exports.cmp(a[i], b[i]);
			if (x != 0) return x;
		}

		return 0;
	}

	// Compare on strings.
	// TODO: Find a better way to sort objects.
	return JSON.stringify(a).localeCompare(JSON.stringify(b));
}


},{"./diff.js":2,"./meta.js":4,"./objects.js":5,"./sequences.js":6,"./values.js":7,"util":31}],4:[function(require,module,exports){
/*  A library of meta-operations.
	
	LIST(array_of_operations)
	
	A composition of zero or more operations, given as an array.

	*/
	
var util = require("util");

var jot = require("./index.js");
var values = require('./values.js');

exports.module_name = 'meta'; // for serialization/deserialization

exports.LIST = function (ops) {
	if (ops == null) throw "Invalid Argument";
	if (!(ops instanceof Array)) throw "Invalid Argument";
	this.ops = ops; // TODO: How to ensure this array is immutable?
	Object.freeze(this);
}
exports.LIST.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.LIST, exports, 'LIST', ['ops']);

exports.LIST.prototype.inspect = function(depth) {
	return util.format("<meta.LIST [%s]>",
		this.ops.map(function(item) { return item.inspect(depth-1) }).join(", "));
}

exports.LIST.prototype.apply = function (document) {
	/* Applies the operation to a document.*/
	for (var i = 0; i < this.ops.length; i++)
		document = this.ops[i].apply(document);
	return document;
}

exports.LIST.prototype.simplify = function (aggressive) {
	/* Returns a new operation that is a simpler version
	   of this operation. Composes consecutive operations where
	   possible and removes no-ops. Returns NO_OP if the result
	   would be an empty list of operations. Returns an
	   atomic (non-LIST) operation if possible. */
	var new_ops = [];
	for (var i = 0; i < this.ops.length; i++) {
		var op = this.ops[i];
		if (op instanceof values.NO_OP) continue; // don't put no-ops into the new list
		
		if (new_ops.length == 0) {
			// first operation
			new_ops.push(op);

		} else {
			for (var j = new_ops.length-1; j >= 0; j--) {
				// try to compose with op[j]
				var c = new_ops[j].atomic_compose(op);
				if (c) {
					if (c instanceof values.NO_OP)
						// they obliterated each other, so remove the one that we already added
						new_ops.splice(j, 1);
					else
						// replace op[j] with the composition
						new_ops[j] = c;
					break;

				} else {
					// We can't bring the op back any further. Insert here.
					new_ops.splice(j+1, 0, op);
					break;
				}
			}
		}
	}

	if (new_ops.length == 0)
		return new values.NO_OP();
	if (new_ops.length == 1)
		return new_ops[0];

	return new exports.LIST(new_ops);
}

exports.LIST.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation:
	   the inverse of each operation in reverse order. */
	var new_ops = [];
	this.ops.forEach(function(op) {
		new_ops.push(op.inverse(document));
		document = op.apply(document);
	})
	new_ops.reverse();
	return new exports.LIST(new_ops);
}

exports.LIST.prototype.atomic_compose = function (other) {
	/* Returns a LIST operation that has the same result as this
	   and other applied in sequence (this first, other after). */

	// Nothing here anyway, return the other.
	if (this.ops.length == 0)
		return other;

	// the next operation is an empty list, so the composition is just this
	if (other instanceof exports.LIST) {
		if (other.ops.length == 0)
			return this;
		
		// concatenate
		return new exports.LIST(this.ops.concat(other.ops));
	}


	// append
	var new_ops = this.ops.slice(); // clone
	new_ops.push(other);
	return new exports.LIST(new_ops);
}

exports.LIST.prototype.rebase = function (other, conflictless) {
	/* Transforms this operation so that it can be composed *after* the other
	   operation to yield the same logical effect. Returns null on conflict. 
	   The conflictless parameter tries to prevent conflicts. */
	return exports.rebase(other, this, conflictless);
}

exports.rebase = function(base, ops, conflictless) {
	if (base instanceof exports.LIST)
		base = base.ops;
	else
		base = [base];

	if (ops instanceof exports.LIST)
		ops = ops.ops;
	else
		ops = [ops];

	var ops = rebase_array(base, ops, conflictless);
	if (ops == null) return null;
	if (ops.length == 0) return new values.NO_OP();
	if (ops.length == 1) return ops[0];
	return new exports.LIST(ops).simplify();
}

function rebase_array(base, ops, conflictless) {
	/* This is one of the core functions of the library: rebasing a sequence
	   of operations against another sequence of operations. */

	/*
	* To see the logic, it will help to put this in a symbolic form.
	*
	*   Let a + b == compose(a, b)
	*   and a / b == rebase(b, a)
	*
	* The contract of rebase has two parts;
	*
	* 	1) a + (b/a) == b + (a/b)
	* 	2) x/(a + b) == (x/a)/b
	*
	* Also note that the compose operator is associative, so
	*
	*	a + (b+c) == (a+b) + c
	*
	* Our return value here in symbolic form is:
	*
	*   (op1/base) + (op2/(base/op1))
	*   where ops = op1 + op2
	*
	* To see that we've implemented rebase correctly, let's look
	* at what happens when we compose our result with base as per
	* the rebase rule:
	*
	*   base + (ops/base)
	*
	* And then do some algebraic manipulations:
	*
	*   base + [ (op1/base) + (op2/(base/op1)) ]   (substituting our hypothesis for self/base)
	*   [ base + (op1/base) ] + (op2/(base/op1))   (associativity)
	*   [ op1 + (base/op1) ] + (op2/(base/op1))    (rebase's contract on the left side)
	*   op1 + [ (base/op1)  + (op2/(base/op1)) ]   (associativity)
	*   op1 + [ op2 + ((base/op1)/op2) ]           (rebase's contract on the right side)
	*   (op1 + op2) + ((base/op1)/op2)             (associativity)
	*   self + [(base/op1)/op2]                    (substituting self for (op1+op2))
	*   self + [base/(op1+op2)]                    (rebase's second contract)
	*   self + (base/self)                         (substitution)
	*
	* Thus we've proved that the rebase contract holds for our return value.
	*/
	
	if (ops.length == 0 || base.length == 0)
		return ops;
	
	if (base.length == 1) {
		// Rebase one or more operations (ops) against a single operation (base[0]).

		// Nothing to do if it is a no-op.
		if (base[0] instanceof values.NO_OP)
			return ops;

		// This is the recursive base case: Rebasing a single operation against a single
		// operation.
		if (ops.length == 1) {
			var op = ops[0].rebase(base[0], conflictless);
			if (!op) return null; // conflict
			if (op instanceof jot.NO_OP) return [];
			return [op];
		}

		// Here we're rebasing more than one operation (ops) against a single operation (base[0]).
		// The result is the first operation in ops rebased against the base concatenated with
		// the remainder of ops rebased against the-base-rebased-against-the-first-operation:
		// (op1/base) + (op2/(base/op1))

		var op1 = ops.slice(0, 1); // first operation
		var op2 = ops.slice(1); // remaining operations
		
		var r1 = rebase_array(base, op1, conflictless);
		if (r1 == null) return null; // rebase failed
		
		var r2 = rebase_array(op1, base, conflictless);
		if (r2 == null) return null; // rebase failed (must be the same as r1, so this test should never succeed)
		
		var r3 = rebase_array(r2, op2, conflictless);
		if (r3 == null) return null; // rebase failed
		
		// returns a new array
		return r1.concat(r3);

	} else {
		// Rebase one or more operations (ops) against >1 operation (base).
		//
		// From the second part of the rebase contract, we can rebase ops
		// against each operation in the base sequentially (base[0], base[1], ...).
		for (var i = 0; i < base.length; i++) {
			ops = rebase_array([base[i]], ops, conflictless);
			if (ops == null) return null; // conflict
		}
		return ops;
	}
}

exports.createRandomOp = function(doc, context) {
	// Create a random LIST that could apply to doc.
	var ops = [];
	while (ops.length == 0 || Math.random() < .75) {
		ops.push(jot.createRandomOp(doc, context));
		doc = ops[ops.length-1].apply(doc);
	}
	return new exports.LIST(ops);
}

},{"./index.js":3,"./values.js":7,"util":31}],5:[function(require,module,exports){
/* A library of operations for objects (i.e. JSON objects/Javascript associative arrays).

   Two operation aliases are provided:
   
   new objects.PUT(key, value)
    
    Creates a property with the given value. The property must not already
    exist in the document. This is an alias for
    new objects.APPLY(key, new values.SET(value)).

   new objects.REM(key)
    
    Removes a property from an object. The property must exist in the document.
    The old value of the property is given as old_value. This is an alias for
    new objects.APPLY(key, new values.SET(MISSING)).

   Two new operation are provided:

   new objects.REN(old_key, new_key)
   new objects.REN({ new_key: old_key })
    
    Renames a property in the document object, renames multiple properties,
    or duplicates properties. In the second form, all old keys that are not
    mentioned as new keys are deleted.

    Supports a conflictless rebase with itself and does not generate conflicts
    with the other operations in this module.

   new objects.APPLY(key, operation)
   new objects.APPLY({key: operation, ...})

    Applies any operation to a property, or multiple operations to various
    properties, on the object.

    Use any operation defined in any of the modules depending on the data type
    of the property. For instance, the operations in values.js can be
    applied to any property. The operations in sequences.js can be used
    if the property's value is a string or array. And the operations in
    this module can be used if the value is another object.

    Supports a conflictless rebase with itself with the inner operations
    themselves support a conflictless rebase. It does not generate conflicts
    with any other operations in this module.

    Example:
    
    To replace the value of a property with a new value:
    
      new objects.APPLY("key1", new values.SET("new_value"))

	or

      new objects.APPLY({ key1: new values.SET("new_value") })

   */
   
var util = require('util');
var deepEqual = require("deep-equal");
var jot = require("./index.js");
var values = require("./values.js");
var LIST = require("./meta.js").LIST;

//////////////////////////////////////////////////////////////////////////////

function shallow_clone(document) {
	var d = { };
	for (var k in document)
		d[k] = document[k];
	return d;
}

//////////////////////////////////////////////////////////////////////////////

exports.module_name = 'objects'; // for serialization/deserialization

exports.REN = function () {
	if (arguments.length == 1 && typeof arguments[0] == "object") {
		// Dict form.
		this.map = arguments[0];
	} else if (arguments.length == 2 && typeof arguments[0] == "string" && typeof arguments[1] == "string") {
		// key & operation form.
		this.map = { };
		this.map[arguments[1]] = arguments[0];
	} else {
		throw "invalid arguments";
	}
	Object.freeze(this);
	Object.freeze(this.map);
}
exports.REN.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.REN, exports, 'REN', ['map']);

exports.APPLY = function () {
	if (arguments.length == 1 && typeof arguments[0] == "object") {
		// Dict form.
		this.ops = arguments[0];
	} else if (arguments.length == 2 && typeof arguments[0] == "string") {
		// key & operation form.
		this.ops = { };
		this.ops[arguments[0]] = arguments[1];
	} else {
		throw "invalid arguments";
	}
	Object.freeze(this);
	Object.freeze(this.ops);
}
exports.APPLY.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.APPLY, exports, 'APPLY', ['ops']);

// The MISSING object is a sentinel to signal the state of an Object property
// that does not exist. It is the old_value to SET when adding a new property
// and the new_value when removing a property.
exports.MISSING = new Object();
Object.freeze(exports.MISSING);

exports.PUT = function (key, value) {
	exports.APPLY.apply(this, [key, new values.SET(value)]);
}
exports.PUT.prototype = Object.create(exports.APPLY.prototype); // inherit prototype

exports.REM = function (key) {
	exports.APPLY.apply(this, [key, new values.SET(exports.MISSING)]);
}
exports.REM.prototype = Object.create(exports.APPLY.prototype); // inherit prototype

//////////////////////////////////////////////////////////////////////////////

exports.REN.prototype.inspect = function(depth) {
	return util.format("<objects.REN %j>", this.map);
}

exports.REN.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new object that is
	   the same type as document but with the changes made. */

	// Clone first.
	var d = shallow_clone(document);

	// Apply duplications.
	for (var new_key in this.map) {
		var old_key = this.map[new_key];
		if (old_key in d)
			d[new_key] = d[old_key];
	}

	// Delete old keys. Must do this after the above since duplications
	// might refer to the same old key multiple times. Delete any old_keys
	// in the mapping that are not mentioned as new keys. This allows us
	// to duplicate and preserve by mapping a key to itself and to new
	// keys.
	for (var new_key in this.map) {
		var old_key = this.map[new_key];
		if (!(old_key in this.map))
			delete d[old_key];
	}

	return d;
}

exports.REN.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of this operation.*/

	// If there are any non-identity mappings, then
	// preserve this object.
	for (var key in this.map) {
		if (key != this.map[key])
			return this;
	}

	return new values.NO_OP();
}

exports.REN.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies. */
	var inv_map = { };
	for (var key in this.map)
		inv_map[this.map[key]] = key;
	return new exports.REN(inv_map);
}

exports.REN.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */

	// merge
	if (other instanceof exports.REN) {
		var map = { };
		for (var key in this.map)
			map[key] = this.map[key];
		for (var key in other.map) {
			if (other.map[key] in map) {
				// The rename is chained.
				map[key] = this.map[other.map[key]];
				delete map[other.map[key]];
			} else {
				// The rename is on another key.
				map[key] = other.map[key];
			}
		}
		return new exports.REN(map);
	}
	
	// No composition possible.
	return null;
}

exports.REN.prototype.rebase_functions = [
	[exports.REN, function(other, conflictless) {
		// Two RENs at the same time.

		// Fast path: If the renames are identical, then each goes
		// to a NO_OP when rebased against the other.
		if (deepEqual(this.map, other.map))
			return [new values.NO_OP(), new values.NO_OP()];

		function inner_rebase(a, b) {
			// Rebase a against b. Keep all of a's renames.
			// Just stop if there is a conflict.
			var new_map = shallow_clone(a.map);
			for (var new_key in b.map) {
				var old_key = b.map[new_key];
				if (new_key in a.map) {
					if (a.map[new_key] != b.map[new_key]) {
						// Both RENs create a property of the same name
						// and not by renaming the same property.
						return null;
					} else {
						// Both RENs renamed the same property to the same
						// new key. So each goes to a no-op on that key since
						// the rename was already made.
						delete new_map[new_key];
					}
				} else {
					// Since a rename has taken place, update any renames
					// in a that are affected.
					for (var a_key in new_map) {
						if (new_map[a_key] == old_key) {
							// Both RENs renamed the same property, but
							// to different keys (if they were the same
							// key then new_key would be in a.map which
							// we already checked).
							return null;
						}
					}
				}
			}
			return new exports.REN(new_map);
		}

		var x = inner_rebase(this, other);
		var y = inner_rebase(other, this);
		if (!x || !y)
			return null;

		return [x, y];
	}],

	[exports.APPLY, function(other, conflictless) {
		// An APPLY applied simultaneously and may have created the
		// key that this operation is also creating through a rename
		// or duplication. That's a conflict.
		// TODO: How to do this in a conflictless way?
		for (var new_key in this.map)
			if (new_key in other.ops)
				return null;

		// If an APPLY applied simultaneously to a key that is not
		// mentioned as a new key in map, there is no conflict but
		// the APPLY's keys may need to be renamed. If a key in the
		// APPLY is involved in duplication, then we must duplicate
		// the operations too.
		//
		// The logic here parallels the logic of REN.apply.

		// Apply duplications.
		var new_apply_ops = shallow_clone(other.ops);
		for (var new_key in this.map) {
			var old_key = this.map[new_key];
			if (old_key in new_apply_ops)
				new_apply_ops[new_key] = new_apply_ops[old_key];
		}

		// Delete old keys.
		for (var new_key in this.map) {
			var old_key = this.map[new_key];
			if (!(old_key in this.map))
				delete new_apply_ops[old_key];
		}

		return [
			this,
			new exports.APPLY(new_apply_ops)
		];
	}]
];

//////////////////////////////////////////////////////////////////////////////

exports.APPLY.prototype.inspect = function(depth) {
	var inner = [];
	var ops = this.ops;
	Object.keys(ops).forEach(function(key) {
		inner.push(util.format("%j:%s", key, ops[key].inspect(depth-1)));
	});
	return util.format("<objects.APPLY %s>", inner.join(", "));
}

exports.APPLY.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new object that is
	   the same type as document but with the change made. */

	// Clone first.
	var d = { };
	for (var k in document)
		d[k] = document[k];

	// Apply. Pass the object and key down in the second argument
	// to apply so that values.SET can handle the special MISSING
	// value.
	for (var key in this.ops) {
		var value = this.ops[key].apply(d[key], [d, key]);
		if (value === exports.MISSING)
			delete d[key]; // key was removed
		else
			d[key] = value;
	}
	return d;
}

exports.APPLY.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of this operation. If there is no sub-operation that is
	   not a NO_OP, then return a NO_OP. Otherwise, simplify all
	   of the sub-operations. */
	var new_ops = { };
	var had_non_noop = false;
	for (var key in this.ops) {
		new_ops[key] = this.ops[key].simplify();
		if (!(new_ops[key] instanceof values.NO_OP))
			// Remember that we have a substantive operation.
			had_non_noop = true;
		else
			// Drop internal NO_OPs.
			delete new_ops[key];
	}
	if (!had_non_noop)
		return new values.NO_OP();
	return new exports.APPLY(new_ops);
}

exports.APPLY.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies. */
	var new_ops = { };
	for (var key in this.ops) {
		new_ops[key] = this.ops[key].inverse(key in document ? document[key] : exports.MISSING);
	}
	return new exports.APPLY(new_ops);
}

exports.APPLY.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */

	// two APPLYs
	if (other instanceof exports.APPLY) {
		// Start with a clone of this operation's suboperations.
		var new_ops = shallow_clone(this.ops);

		// Now compose with other.
		for (var key in other.ops) {
			if (!(key in new_ops)) {
				// Operation in other applies to a key not present
				// in this, so we can just merge - the operations
				// happen in parallel and don't affect each other.
				new_ops[key] = other.ops[key];
			} else {
				// Compose.
				var op2 = new_ops[key].compose(other.ops[key]);

				// They composed to a no-op, so delete the
				// first operation.
				if (op2 instanceof values.NO_OP)
					delete new_ops[key];

				else
					new_ops[key] = op2;
			}
		}

		return new exports.APPLY(new_ops).simplify();
	}

	// No composition possible.
	return null;
}

exports.APPLY.prototype.rebase_functions = [
	[exports.APPLY, function(other, conflictless) {
		// Rebase the sub-operations on corresponding keys.
		// If any rebase fails, the whole rebase fails.
		var new_ops_left = { };
		for (var key in this.ops) {
			new_ops_left[key] = this.ops[key];
			if (key in other.ops)
				new_ops_left[key] = new_ops_left[key].rebase(other.ops[key], conflictless);
			if (new_ops_left[key] === null)
				return null;
		}

		var new_ops_right = { };
		for (var key in other.ops) {
			new_ops_right[key] = other.ops[key];
			if (key in this.ops)
				new_ops_right[key] = new_ops_right[key].rebase(this.ops[key], conflictless);
			if (new_ops_right[key] === null)
				return null;
		}

		return [
			new exports.APPLY(new_ops_left).simplify(),
			new exports.APPLY(new_ops_right).simplify()
		];
	}]
]

exports.createRandomOp = function(doc, context) {
	throw "not implemented yet";
}

},{"./index.js":3,"./meta.js":4,"./values.js":7,"deep-equal":8,"util":31}],6:[function(require,module,exports){
/* An operational transformation library for sequence-like objects,
   i.e. strings and arrays.

   The main operation provided by this library is PATCH, which represents
   a set of non-overlapping changes to a string or array. Each change,
   called a hunk, applies an operation to a subsequence -- i.e. a sub-string
   or a slice of the array. The operation's .apply method yields a new
   sub-sequence, and they are stitched together (along with unchanged elements)
   to form the new document that results from the PATCH operation.

   The internal structure of the PATCH operation is an array of hunks as
   follows:

   new sequences.PATCH(
     [
       { offset: ..., # unchanged elements to skip before this hunk
         length: ..., # length of subsequence modified by this hunk
         op: ...      # jot operation to apply to the subsequence
       },
       ...
     ]
    )

   The operation must define a "get_length_change" function that returns the
   length of the subsequence after the operation is applied. Composition and
   conflictless rebasing are also supported by a "decompose_right" function on
   the inner operation. NO_OP, SET, and MAP define these functions.

   This library also defines the MAP operation, which applies a jot
   operation to every element of a sequence. The MAP operation is
   also used with length-one hunks to apply an operation to a single
   element. On strings, the MAP operation only accepts inner operations
   that yield back single characters so that a MAP on a string does
   not change the string's length.

   The internal structure of the MAP operation is:

   new sequences.MAP(op)
 
   Shortcuts for constructing useful PATCH operations are provided:

		new sequences.SPLICE(pos, length, new_value)

			 Equivalent to:

			 PATCH([{
				 offset: pos,
				 length: length,
				 op: new values.SET(new_value)
				 }])
			 
			 i.e. replace elements with other elements
		
		new sequences.APPLY(pos, op)

			 Equivalent to:

			 PATCH([{
				 offset: pos,
				 length: 1,
				 op: new sequences.MAP(op)
				 }])
			 
			 i.e. apply the operation to the single element at pos

		new sequences.APPLY({ pos: op, ... })

			 Similar to the above but for multiple operations at once.

		Supports a conflictless rebase with other PATCH operations.

	 */
	 
var util = require('util');
var deepEqual = require("deep-equal");
var jot = require("./index.js");
var values = require("./values.js");
var LIST = require("./meta.js").LIST;

// utilities

function elem(seq, pos) {
	// get an element of the sequence
	if (typeof seq == "string")
		return seq.charAt(pos);
	else // is an array
		return seq[pos];
}
function concat2(item1, item2) {
	if (item1 instanceof String)
		return item1 + item2;
	return item1.concat(item2);
}
function concat3(item1, item2, item3) {
	if (item1 instanceof String)
		return item1 + item2 + item3;
	return item1.concat(item2).concat(item3);
}
function map_index(pos, move_op) {
	if (pos >= move_op.pos && pos < move_op.pos+move_op.count) return (pos-move_op.pos) + move_op.new_pos; // within the move
	if (pos < move_op.pos && pos < move_op.new_pos) return pos; // before the move
	if (pos < move_op.pos) return pos + move_op.count; // a moved around by from right to left
	if (pos > move_op.pos && pos >= move_op.new_pos) return pos; // after the move
	if (pos > move_op.pos) return pos - move_op.count; // a moved around by from left to right
	throw "unhandled problem"
}

//////////////////////////////////////////////////////////////////////////////

exports.module_name = 'sequences'; // for serialization/deserialization

exports.PATCH = function () {
	/* An operation that replaces a subrange of the sequence with new elements. */
	if (arguments[0] === "__hmm__") return; // used for subclassing
	if (arguments.length != 1)
		throw "Invaid Argument";

	this.hunks = arguments[0];

	// Sanity check & freeze hunks.
	if (!Array.isArray(this.hunks))
		throw "Invaid Argument";
	this.hunks.forEach(function(hunk) {
		if (typeof hunk.offset != "number")
			throw "Invalid Argument (hunk offset not a number)";
		if (hunk.offset < 0)
			throw "Invalid Argument (hunk offset is negative)";
		if (typeof hunk.length != "number")
			throw "Invalid Argument (hunk length is not a number)";
		if (hunk.length < 0)
			throw "Invalid Argument (hunk length is negative)";
		if (!(hunk.op instanceof jot.BaseOperation))
			throw "Invalid Argument (hunk operation is not an operation)";
		if (typeof hunk.op.get_length_change != "function")
			throw "Invalid Argument (hunk operation does not support get_length_change)";
		Object.freeze(hunk);
	});

	Object.freeze(this);
}
exports.PATCH.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.PATCH, exports, 'PATCH', ['hunks']);

	// shortcuts

	exports.SPLICE = function (pos, length, new_value) {
		// value.slice(0,0) is a shorthand for constructing an empty string or empty list, generically
		exports.PATCH.apply(this, [[{
			offset: pos,
			length: length,
			op: new values.SET(new_value)
		}]]);
	}
	exports.SPLICE.prototype = new exports.PATCH("__hmm__"); // inherit prototype

	exports.APPLY = function () {
		var indexes;
		var op_map;
		if (arguments.length == 1) {
			// The argument is a mapping from indexes to operations to apply
			// at those indexes. Collect all of the integer indexes in sorted
			// order.
			op_map = arguments[0];
			indexes = [];
			Object.keys(op_map).forEach(function(index) { indexes.push(parseInt(index)); });
			indexes.sort();
		} else if (arguments.length == 2) {
			// The arguments are just a single position and operation.
			indexes = [arguments[0]];
			op_map = { };
			op_map[arguments[0]] = arguments[1];
		} else {
			throw "Invalid Argument"
		}

		// Form hunks.
		var hunks = [];
		var offset = 0;
		indexes.forEach(function(index) {
			hunks.push({
				offset: index-offset,
				length: 1,
				op: new exports.MAP(op_map[index])
			})
			offset = index+1;
		});
		exports.PATCH.apply(this, [hunks]);
	}
	exports.APPLY.prototype = new exports.PATCH("__hmm__"); // inherit prototype

exports.MOVE = function (pos, count, new_pos) {
	if (pos == null || count == null || count == 0 || new_pos == null) throw "Invalid Argument";
	this.pos = pos;
	this.count = count;
	this.new_pos = new_pos;
	Object.freeze(this);
}
exports.MOVE.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.MOVE, exports, 'MOVE', ['pos', 'count', 'new_pos']);

exports.MAP = function (op) {
	if (op == null) throw "Invalid Argument";
	this.op = op;
	Object.freeze(this);
}
exports.MAP.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.MAP, exports, 'MAP', ['op']);

//////////////////////////////////////////////////////////////////////////////

exports.PATCH.prototype.inspect = function(depth) {
	return util.format("<sequences.PATCH%s>",
		this.hunks.map(function(hunk) {
			if ((hunk.length == 1) && (hunk.op instanceof exports.MAP))
				// special format
				return util.format(" +%d %s",
					hunk.offset,
					hunk.op.op.inspect(depth-1));

			return util.format(" +%dx%d %s",
				hunk.offset,
				hunk.length,
				hunk.op instanceof values.SET
					? util.format("%j", hunk.op.new_value)
					: hunk.op.inspect(depth-1))
		}).join(","));
}

exports.PATCH.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new sequence that is
		 the same type as document but with the hunks applied. */
	
	var index = 0;
	var ret = document.slice(0,0); // start with an empty document
	
	this.hunks.forEach(function(hunk) {
		if (index + hunk.offset + hunk.length > document.length)
			throw "offset past end of document";

		// Append unchanged content before this hunk.
		ret = concat2(ret, document.slice(index, index+hunk.offset));
		index += hunk.offset;

		// Append new content.
		var new_value = hunk.op.apply(document.slice(index, index+hunk.length));

		if (typeof document == "string" && typeof new_value != "string")
			throw "operation yielded invalid substring";
		if (Array.isArray(document) && !Array.isArray(new_value))
			throw "operation yielded invalid subarray";

		ret = concat2(ret, new_value);

		// Advance counter.
		index += hunk.length;
	});
	
	// Append unchanged content after the last hunk.
	ret = concat2(ret, document.slice(index));
	
	return ret;
}

exports.PATCH.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
		 of this operation.*/

	// Simplify the hunks by removing any that don't make changes.
	// Adjust offsets.

	// Some of the composition methods require knowing if these operations
	// are operating on a string or an array. We might not know if the PATCH
	// only has sub-operations where we can't tell, like a MAP.
	var doctype = null;
	this.hunks.forEach(function (hunk) {
		if (hunk.op instanceof values.SET) {
			if (typeof hunk.op.new_value == "string")
				doctype = "string";
			else if (Array.isArray(hunk.op.new_value))
				doctype = "array";
		}
	});

	// Form a new set of merged hunks.

	var hunks = [];
	var doffset = 0;

	function handle_hunk(hunk) {
		var op = hunk.op.simplify();
		
		if (op.isNoOp()) {
			// Drop it, but adjust future offsets.
			doffset += hunk.offset + hunk.length;
			return;

		} else if (hunk.length == 0 && hunk.op.get_length_change(hunk.length) == 0) {
			// Drop it, but adjust future offsets.
			doffset += hunk.offset;
			return;

		} else if (op instanceof exports.PATCH) {
			// A PATCH within a PATCH, fun. Account for the range
			// after the last inner hunk through the end of the
			// outer hunk.
			var count = 0;
			op.hunks.forEach(function(hunk) {
				handle_hunk(hunk);
				count += hunk.offset + hunk.length;
			});
			doffset += hunk.length - count;
			return;

		} else if (hunks.length > 0
			&& hunk.offset + doffset == 0) {
			
			// The hunks are adjacent. We can combine them
			// if one of the operations is a SET and the other
			// is a SET or a MAP containing a SET.
			// We can't combine two adjancent MAP->SET's because
			// we wouldn't know whether the combined value (in
			// a SET) should be a string or an array.
			if ((hunks[hunks.length-1].op instanceof values.SET
				|| (hunks[hunks.length-1].op instanceof exports.MAP && hunks[hunks.length-1].op.op instanceof values.SET))
			 && (hunk.op instanceof values.SET || 
			 	  (hunk.op instanceof exports.MAP && hunk.op.op instanceof values.SET) )
			 && doctype != null) {

				function get_value(hunk) {
				 	if (hunk.op instanceof values.SET) {
				 		// The value is just the SET's new_value.
				 		return hunk.op.new_value;
				 	} else {
				 		// The value is a sequence of the hunk's length
				 		// where each element is the value of the inner
				 		// SET's new_value.
					 	var value = [];
					 	for (var i = 0; i < hunk.length; i++)
					 		value.push(hunk.op.op.new_value);

					 	// If the outer value is a string, reform it as
					 	// a string.
					 	if (doctype == "string")
					 		value = value.join("");
					 	return value;
				 	}
				}

				hunks[hunks.length-1] = {
					offset: hunks[hunks.length-1].offset,
					length: hunks[hunks.length-1].length + hunk.length,
					op: new values.SET(
						concat2(
							get_value(hunks[hunks.length-1]),
							get_value(hunk))
						)
				};

				return;
			}

		}

		// Preserve but adjust offset.
		var newhunk = {
			offset: hunk.offset+doffset,
			length: hunk.length,
			op: op
		}
		hunks.push(newhunk);
	}
	
	this.hunks.forEach(handle_hunk);
	if (hunks.length == 0)
		return new values.NO_OP();
	
	return new exports.PATCH(hunks);
}

exports.PATCH.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies.
	   The inverse simply inverts the operations on the hunks, but the
	   lengths have to be fixed. */
	var offset = 0;
	return new exports.PATCH(this.hunks.map(function(hunk) {
		var newhunk = {
			offset: hunk.offset,
			length: hunk.length + hunk.op.get_length_change(hunk.length),
			op: hunk.op.inverse(document.slice(offset+hunk.offset, offset+hunk.offset+hunk.length))
		}
		offset += hunk.offset + hunk.length;
		return newhunk;
	}));
}

function compose_patches(a, b) {
	// Compose two patches. We do this as if we are zipping up two sequences,
	// where the index into the (hypothetical) sequence that results *after*
	// a is applied lines up with the index into the (hypothetical) sequence
	// before b is applied.
	
	var hunks = [];
	var index = 0;

	function make_state(op, side) {
		return {
			index: 0,
			hunks: op.hunks.slice(),
			empty: function() { return this.hunks.length == 0; },
			take: function() {
				var h = this.hunks[0];
				hunks.push({
					offset: this.index + h.offset - index,
					length: h.length,
					op: h.op
				});
				this.index = this.end();
				index = this.index;
				this.hunks.shift();
			},
			skip: function() {
				this.index = this.end();
				this.hunks.shift();
			},
			start: function() {
				return this.index + this.hunks[0].offset;
			},
			end: function() {
				var h = this.hunks[0];
				var ret = this.index + h.offset + h.length;
				if (side == 0)
					ret += h.op.get_length_change(h.length);
				return ret;
			}
		}
	}
	
	var a_state = make_state(a, 0),
	    b_state = make_state(b, 1);
	
	while (!a_state.empty() || !b_state.empty()) {
		// Only operations in 'a' are remaining.
		if (b_state.empty()) {
			a_state.take();
			continue;
		}

		// Only operations in 'b' are remaining.
		if (a_state.empty()) {
			b_state.take();
			continue;
		}

		// The next hunk in 'a' precedes the next hunk in 'b'.
		if (a_state.end() <= b_state.start()) {
			a_state.take();
			continue;
		}

		// The next hunk in 'b' precedes the next hunk in 'a'.
		if (b_state.end() <= a_state.start()) {
			b_state.take();
			continue;
		}

		// There's overlap.

		var dx_start = b_state.start() - a_state.start();
		var dx_end = b_state.end() - a_state.end();
		if (dx_start >= 0 && dx_end <= 0) {
			// 'a' wholly encompasses 'b', including the case where they
			// changed the exact same elements.

			// Compose a's and b's suboperations using
			// atomic_compose. If the two hunks changed the exact same
			// elements, then we can compose the two operations directly.
			var b_op = b_state.hunks[0].op;
			if (dx_start != 0 || dx_end != 0) {
				// If 'a' whole encompasses 'b', we can make an operation
				// that spans the same elements by wrapping b's operation
				// in a PATCH.
				b_op = new exports.PATCH([{ offset: dx_start, length: b_state.hunks[0].length, op: b_op }]);
			}

			// Replace the 'a' operation with itself composed with b's operation.
			// Don't take it yet because there could be more coming on b's
			// side that is within the range of 'a'.
			a_state.hunks[0] = {
				offset: a_state.hunks[0].offset,
				length: a_state.hunks[0].length,
				op: a_state.hunks[0].op.atomic_compose(b_op)
			};
			if (a_state.hunks[0].op == null)
				return null;

			// Drop b.
			b_state.skip();
			continue;
		}

		if (dx_start <= 0 && dx_end >= 0) {
			// 'b' wholly consumes 'a'. We can't drop a's operation, in the
			// general case. If 'b' is a SET, then we can drop a's operation
			// because we know it does not depend on prior state. Same with
			// NO_OP. In either case we have to update b's length since it
			// is operating on elements that were inserted/deleted by a.
			if (b_state.hunks[0].op.isNoOp()
				|| b_state.hunks[0].op instanceof values.SET) {
				b_state.take();
				hunks[hunks.length-1].length -= a_state.hunks[0].op.get_length_change(a_state.hunks[0].length);
				a_state.skip();
				continue;
			}
		}

		// There is some sort of other overlap. We can handle this by attempting
		// to decompose the operations.
		if (dx_start > 0) {
			// 'a' begins first. Attempt to decompose it into two operations.
			if (!a_state.hunks[0].op.decompose_right)
				return null;
			var decomp = a_state.hunks[0].op.decompose_right(dx_start);
			if (!decomp)
				return null;

			// Take the left part of the decomposition.
			hunks.push({
				offset: a_state.index + a_state.hunks[0].offset - index,
				length: a_state.hunks[0].length,
				op: decomp[0]
			});
			a_state.index += dx_start;
			index += dx_start;

			// Return the right part of the decomposition to the hunks array.
			a_state.hunks[0] = {
				offset: 0,
				length: 0,
				op: decomp[1]
			};
			continue;
		}

		if (dx_start < 0) {
			// 'b' begins first. Attempt to decompose it into two operations.
			// The decompose_right method takes an index into the sequence
			// after the operation applies, but dx_start applies to the
			// document before 'b' applies, so we pass it an arbitrary
			// index of zero.
			if (!b_state.hunks[0].op.decompose_right)
				return null;
			var decomp = b_state.hunks[0].op.decompose_right(0);
			if (!decomp)
				return null;

			// Take the left part of the decomposition.
			hunks.push({
				offset: b_state.index + b_state.hunks[0].offset - index,
				length: (-dx_start),
				op: decomp[0]
			});
			b_state.index += (-dx_start);
			index += (-dx_start);

			// Return the right part of the decomposition to the hunks array.
			b_state.hunks[0] = {
				offset: 0,
				length: b_state.hunks[0].length - (-dx_start),
				op: decomp[1]
			};
			continue;
		}

		// There is no atomic composition.
		return null;
	}

	return new exports.PATCH(hunks).simplify();
}

exports.PATCH.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
		 and other applied in sequence (this first, other after). Returns
		 null if no atomic operation is possible. */

	// a PATCH composes with a PATCH
	if (other instanceof exports.PATCH)
		return compose_patches(this, other);

	// No composition possible.
	return null;
}

function rebase_patches(a, b, conflictless) {
	// Rebasing two PATCHes works like compose, except that we are aligning
	// 'a' and 'b' both on the state of the document before each has applied.
	//
	// We do this as if we are zipping up two sequences, where the index into
	// the (hypothetical) sequence, before either operation applies, lines
	// up across the two operations.
	
	function make_state(op) {
		return {
			old_index: 0,
			old_hunks: op.hunks.slice(),
			new_index: 0,
			new_hunks: [],
			empty: function() { return this.old_hunks.length == 0; },
			take: function() {
				var h = this.old_hunks[0];
				this.new_hunks.push({
					offset: this.old_index + h.offset - this.new_index,
					length: h.length,
					op: h.op
				});
				this.old_index = this.end();
				this.new_index = this.old_index;
				this.old_hunks.shift();
			},
			skip: function() {
				this.old_index = this.end();
				this.old_hunks.shift();
			},
			start: function() {
				return this.old_index + this.old_hunks[0].offset;
			},
			end: function() {
				var h = this.old_hunks[0];
				return this.old_index + h.offset + h.length;
			}
		}
	}
	
	var a_state = make_state(a),
	    b_state = make_state(b);
	
	while (!a_state.empty() || !b_state.empty()) {
		// Only operations in 'a' are remaining.
		if (b_state.empty()) {
			a_state.take();
			continue;
		}

		// Only operations in 'b' are remaining.
		if (a_state.empty()) {
			b_state.take();
			continue;
		}

		// Two insertions at the same location.
		if (a_state.start() == b_state.start()
			&& a_state.old_hunks[0].length == 0
			&& b_state.old_hunks[0].length == 0) {
			
			// This is a conflict because we don't know which side
			// gets inserted first.
			if (!conflictless)
				return null;

			// Or we can resolve the conflict.
			if (jot.cmp(a_state.old_hunks[0].op, b_state.old_hunks[0].op) < 0) {
				b_state.new_index -= a_state.old_hunks[0].op.get_length_change(a_state.old_hunks[0].length);
				a_state.take();
			} else {
				a_state.new_index -= b_state.old_hunks[0].op.get_length_change(b_state.old_hunks[0].length);
				b_state.take();
			}
			continue;
		}


		// The next hunk in 'a' precedes the next hunk in 'b'.
		// Take 'a' and adjust b's next offset.
		if (a_state.end() <= b_state.start()) {
			b_state.new_index -= a_state.old_hunks[0].op.get_length_change(a_state.old_hunks[0].length);
			a_state.take();
			continue;
		}

		// The next hunk in 'b' precedes the next hunk in 'a'.
		// Take 'b' and adjust a's next offset.
		if (b_state.end() <= a_state.start()) {
			a_state.new_index -= b_state.old_hunks[0].op.get_length_change(b_state.old_hunks[0].length);
			b_state.take();
			continue;
		}

		// There's overlap.

		var dx_start = b_state.start() - a_state.start();
		var dx_end = b_state.end() - a_state.end();

		// They both affected the exact same region, so just rebase the
		// inner operations and update lengths.
		if (dx_start == 0 && dx_end == 0) {
			var ar = a_state.old_hunks[0].op.rebase(b_state.old_hunks[0].op, conflictless);
			var br = b_state.old_hunks[0].op.rebase(a_state.old_hunks[0].op, conflictless);
			if (ar == null || br == null)
				return null;
			a_state.old_hunks[0] = {
				offset: a_state.old_hunks[0].offset,
				length: a_state.old_hunks[0].length + b_state.old_hunks[0].op.get_length_change(b_state.old_hunks[0].length),
				op: ar
			}
			b_state.old_hunks[0] = {
				offset: b_state.old_hunks[0].offset,
				length: b_state.old_hunks[0].length + a_state.old_hunks[0].op.get_length_change(a_state.old_hunks[0].length),
				op: br
			}
			a_state.take();
			b_state.take();
			continue;
		}

		// Other overlaps generate conflicts.
		if (!conflictless)
			return null;

		// One side starts before the other. Take it.
		if (dx_start > 0) {
			// 'a' starts first.
			
		}
	}

	return [
		new exports.PATCH(a_state.new_hunks).simplify(),
		new exports.PATCH(b_state.new_hunks).simplify() ];
}

exports.PATCH.prototype.rebase_functions = [
	/* Transforms this operation so that it can be composed *after* the other
		 operation to yield the same logical effect. Returns null on conflict. */

	[exports.PATCH, function(other, conflictless) {
		// Return the new operations.
		return rebase_patches(this, other, conflictless);
	}],

	[exports.MOVE, function(other, conflictless) {
		// TODO
	}]
];

//////////////////////////////////////////////////////////////////////////////

exports.MOVE.prototype.inspect = function(depth) {
	return util.format("<sequences.MOVE @%dx%d => @%d>", this.pos, this.count, this.new_pos);
}

exports.MOVE.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new sequence that is
		 the same type as document but with the subrange moved. */
	if (this.pos < this.new_pos)
		return concat3(document.slice(0, this.pos), document.slice(this.pos+this.count, this.new_pos), document.slice(this.pos, this.pos+this.count) + document.slice(this.new_pos));
	else
		return concat3(document.slice(0, this.new_pos), document.slice(this.pos, this.pos+this.count), document.slice(this.new_pos, this.pos), document.slice(this.pos+this.count));
}

exports.MOVE.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
		 of this operation.*/
	if (this.pos == this.new_pos)
		return new values.NO_OP();	   
	return this;
}

exports.MOVE.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation */
	if (this.new_pos > this.pos)
		return new exports.MOVE(this.new_pos - this.count, this.count, this.pos);
	else
		return new exports.MOVE(this.new_pos, this.count, this.pos + this.count);
}

exports.MOVE.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
		 and other applied in sequence (this first, other after). Returns
		 null if no atomic operation is possible. */

	// The same range moved a second time.
	if (other instanceof exports.MOVE && this.new_pos == other.pos && this.count == other.count)
		return new exports.MOVE(this.pos, other.new_pos, a.count)

	// No composition possible.
	return null;
}

exports.MOVE.prototype.rebase_functions = [
	[exports.MOVE, function(other, conflictless) {
		// moves intersect
		if (this.pos+this.count >= other.pos && this.pos < other.pos+other.count)
			return null;
		return [
			new exports.MOVE(map_index(this.pos, other), this.count, map_index(this.new_pos, other)),
			null // second element is not used when the types of the two operations is the same
		];
	}],
	[exports.MAP, function(other, conflictless) {
		// The MOVE changes the order but not the values and the MAP changes
		// values but doesn't care about order, so they don't bother each other.
		return [this, other];
	}]
];

//////////////////////////////////////////////////////////////////////////////

exports.MAP.prototype.inspect = function(depth) {
	return util.format("<sequences.MAP %s>", this.op.inspect(depth-1));
}

exports.MAP.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new sequence that is
		 the same type as document but with the element modified. */

 	// Turn string into array of characters.
	var d;
	if (typeof document == 'string')
		d = document.split(/.{0}/)

	// Clone array.
	else
		d = document.slice(); // clone
	
	// Apply operation to each element.
	for (var i = 0; i < d.length; i++) {
		d[i] = this.op.apply(d[i])

		// An operation on strings must return a single character.
		if (typeof document == 'string' && (typeof d[i] != 'string' || d[i].length != 1))
			throw "Invalid operation: String type or length changed."
	}

	// Turn the array of characters back into a string.
	if (typeof document == 'string')
		return d.join("");

	return d;
}

exports.MAP.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
		 of this operation.*/
	var op = this.op.simplify();
	if (op instanceof values.NO_OP)
		return new values.NO_OP();	   
	return this;
}

exports.MAP.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation. */

	if (document.length == 0)
		return new exports.NO_OP();
	if (document.length == 1)
		return new exports.MAP(this.op.inverse(document[0]));

	// Since the inverse depends on the value of the document and the
	// elements of document may not all be the same, we have to explode
	// this out into individual operations.
	var hunks = [];
	if (typeof document == 'string')
		document = document.split(/.{0}/);
	document.forEach(function(element) {
		hunks.append({
			offset: 0,
			length: 1,
			op: this.op.inverse(element)
		});
	});
	return new exports.PATCH(hunks);
}

exports.MAP.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
		 and other applied in sequence (this first, other after). Returns
		 null if no atomic operation is possible. */

	// two MAPs with atomically composable sub-operations
	if (other instanceof exports.MAP) {
		var op2 = this.op.atomic_compose(other.op);
		if (op2)
			return new exports.MAP(op2);
	}

	// No composition possible.
	return null;
}

exports.MAP.prototype.rebase_functions = [
	[exports.MAP, function(other, conflictless) {
		// Two MAPs. The rebase succeeds only if a rebase on the
		// inner operations succeeds.
		var opa = this.op.rebase(other.op, conflictless);
		var opb = other.op.rebase(this.op, conflictless);
		if (opa && opb)
			return [
				(opa instanceof values.NO_OP) ? new values.NO_OP() : new exports.MAP(opa),
				(opb instanceof values.NO_OP) ? new values.NO_OP() : new exports.MAP(opb)
			];
	}]
];

exports.MAP.prototype.get_length_change = function (old_length) {
	// Support routine for PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	return 0;
}

exports.MAP.prototype.decompose_right = function (at_old_index, at_new_index) {
	// Support routine for PATCH that returns a decomposition of the
	// operation splitting it at a point in the subsequence this operation
	// applies to. But since MAP applies to all elements, the decomposition
	// is trivial.
	return [this, this];
}

////

exports.createRandomOp = function(doc, context) {
	// Create a random operation that could apply to doc.
	// Choose uniformly across various options.
	var ops = [];

	// Construct a PATCH.
	ops.push(function() {
		var hunks = [];
		var dx = 0;

		while (dx < doc.length) {
			// Construct a random hunk. First select a range in the
			// document to modify.
			var offset = dx + Math.floor(Math.random() * (doc.length+1-dx));
			var old_length = Math.floor(Math.random() * (doc.length - offset + ((offset<doc.length) ? 1 : 0)));
			var old_value = doc.slice(offset, offset+old_length);

			// Choose an inner operation.
			var op = values.createRandomOp(old_value, context);

			// Push the hunk.
			hunks.push({
				offset: offset-dx,
				length: old_length,
				op: op
			});

			dx = offset + old_length;

			// Create another hunk?
			if (Math.random() < .25)
				break;
		}

		return new exports.PATCH(hunks);
	});

	// Construct a MAP. We may not construct a valid MAP because
	// the random inner operation that we construct for one element
	// may not be valid on all elements.
	if (doc.length > 0) {
		ops.push(function() {
			var random_elem = elem(doc, Math.floor(Math.random() * doc.length));
			var op = values.createRandomOp(random_elem, context);
			return new exports.MAP(op);
		});
	}

	// Select randomly.
	return ops[Math.floor(Math.random() * ops.length)]();
}

},{"./index.js":3,"./meta.js":4,"./values.js":7,"deep-equal":8,"util":31}],7:[function(require,module,exports){
/*  An operational transformation library for atomic values. This
	library provides three operations: NO_OP (an operation that
	does nothing), SET (replace the document with a new value), and
	MATH (apply a function to the document). These functions are generic
	over various sorts of data types that they may apply to.

	new values.NO_OP()

	This operation does nothing. It is the return value of various
	functions throughout the library, e.g. when operations cancel
	out. NO_OP is conflictless: It never creates a conflict when
	rebased against or operations or when other operations are
	rebased against it.
	

	new values.SET(new_value)
	
	The atomic replacement of one value with another. Works for
	any data type. Supports a conflictless rebase with other SET
	and MATH operations.
	

	new values.MATH(operator, operand)
	
	Applies a commutative arithmetic function to a number.
	
	"add": addition (use a negative number to decrement)
	
	"mult": multiplication (use the reciprocal to divide)
	
	"rot": addition followed by modulus (the operand is given
	       as a tuple of the increment and the modulus). The document
	       object must be non-negative and less than the modulus.

	"xor": bitwise exclusive-or (over integers and booleans
	       only)
	
	Note that by commutative we mean that the operation is commutative
	under composition, i.e. add(1)+add(2) == add(2)+add(1).

	MATH supports a conflictless rebase with other MATH and SET operations.
	
	*/
	
var util = require('util');
var deepEqual = require("deep-equal");
var jot = require("./index.js");
var MISSING = require("./objects.js").MISSING;

//////////////////////////////////////////////////////////////////////////////

exports.module_name = 'values'; // for serialization/deserialization

exports.NO_OP = function() {
	/* An operation that makes no change to the document. */
	Object.freeze(this);
}
exports.NO_OP.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.NO_OP, exports, 'NO_OP', []);

exports.SET = function(new_value) {
	/* An operation that replaces the document with a new (atomic) value. */
	this.new_value = new_value;
	Object.freeze(this);
}
exports.SET.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.SET, exports, 'SET', ['new_value']);

exports.MATH = function(operator, operand) {
	/* An operation that applies addition, multiplication, or rotation (modulus addition)
	   to a numeric document. */
	this.operator = operator;
	this.operand = operand;
	Object.freeze(this);
}
exports.MATH.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.MATH, exports, 'MATH', ['operator', 'operand']);


//////////////////////////////////////////////////////////////////////////////

exports.NO_OP.prototype.inspect = function(depth) {
	return "<values.NO_OP>"
}

exports.NO_OP.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns the document
	   unchanged. */
	return document;
}

exports.NO_OP.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of this operation.*/
	return this;
}

exports.NO_OP.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	given the state of the document before the operation applies. */
	return this;
}

exports.NO_OP.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */
	return other;
}

exports.NO_OP.prototype.get_length_change = function (old_length) {
	// Support routine for sequences.PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	return 0;
}

exports.NO_OP.prototype.decompose_right = function (at_old_index, at_new_index) {
	// Support routine for sequences.PATCH.
	return [this, this];
}

//////////////////////////////////////////////////////////////////////////////

exports.SET.prototype.inspect = function(depth) {
	function str(v) {
		// Render the special MISSING value from objects.js
		// not as a JSON object.
		if (v === MISSING)
			return "~";

		// Render any other value as a JSON string.
		return util.format("%j", v);
	}
	return util.format("<values.SET %s>", str(this.new_value));
}

exports.SET.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns the new
	   value, regardless of the document. */
	return this.new_value;
}

exports.SET.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of another operation. If the new value is the same as the
	   old value, returns NO_OP. */
	return this;
}

exports.SET.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies. */
	return new exports.SET(document);
}

exports.SET.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible.
	   Returns a new SET operation that simply sets the value to what
	   the value would be when the two operations are composed. */
	return new exports.SET(other.apply(this.new_value)).simplify();
}

exports.SET.prototype.rebase_functions = [
	// Rebase this against other and other against this.

	[exports.SET, function(other, conflictless) {
		// SET and SET.

		// If they both set the the document to the same value, then the one
		// applied second (the one being rebased) becomes a no-op. Since the
		// two parts of the return value are for each rebased against the
		// other, both are returned as no-ops.
		if (deepEqual(this.new_value, other.new_value, { strict: true }))
			return [new exports.NO_OP(), new exports.NO_OP()];
		
		// If they set the document to different values and conflictless is
		// true, then we clobber the one whose value has a lower sort order.
		if (conflictless && jot.cmp(this.new_value, other.new_value) < 0)
			return [new exports.NO_OP(), new exports.SET(other.new_value)];

		// cmp > 0 is handled by a call to this function with the arguments
		// reversed, so we don't need to explicltly code that logic.

		// If conflictless is false, then we can't rebase the operations
		// because we can't preserve the meaning of both. Return null to
		// signal conflict.
		return null;
	}],

	[exports.MATH, function(other, conflictless) {
		// SET (this) and MATH (other). To get a consistent effect no matter
		// which order the operations are applied in, we say the SET comes
		// first and the MATH second. But since MATH only works for numeric
		// types, this isn't always possible.

		// To get the logical effect of applying MATH second (even though it's
		// the SET being rebased, meaning it will be composed second), we
		// apply the MATH operation to its new value.
		try {
			// If the data types make this possible...
			return [
				new exports.SET(other.apply(this.new_value)),
				other // no change is needed when it is the MATH being rebased
				];
		} catch (e) {
			// Data type mismatch, e.g. the SET sets the value to a string and
			// so the MATH operation can't be applied. In this case, we simply
			// always prefer the SET if we're asked for a conflictless rebase.
			// The MATH becomes a no-op.
			if (conflictless)
				return [
					new exports.SET(this.new_value),
					new exports.NO_OP()
					];
		}

		// Can't resolve conflict.
		return null;
	}]
];

exports.SET.prototype.get_length_change = function (old_length) {
	// Support routine for sequences.PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	if (typeof this.new_value == "string" || Array.isArray(this.new_value))
		return this.new_value.length - old_length;
	throw "not applicable";
}

exports.SET.prototype.decompose_right = function (at_new_index) {
	// Support routine for sequences.PATCH that returns a decomposition
	// of the operation (over a sequence-like object) that splits it
	// at the given index in the new value.
	if (typeof this.new_value == "string" || Array.isArray(this.new_value))
		return [
			new exports.SET(this.new_value.slice(0, at_new_index)),
			new exports.SET(this.new_value.slice(at_new_index))
		];
	return null;
}

//////////////////////////////////////////////////////////////////////////////

exports.MATH.prototype.inspect = function(depth) {
	return util.format("<values.MATH %s:%j>", this.operator, this.operand);
}

exports.MATH.prototype.apply = function (document) {
	/* Applies the operation to this.operand. Applies the operator/operand
	   as a function to the document. */
	if (typeof document != "number" && typeof document != "boolean")
		throw "Invalid operation on non-numeric document."
	if (this.operator == "add")
		return document + this.operand;
	if (this.operator == "rot")
		return (document + this.operand[0]) % this.operand[1];
	if (this.operator == "mult")
		return document * this.operand;
	if (this.operator == "xor") {
		var ret = document ^ this.operand;
		if (typeof document == 'boolean')
			ret = !!ret; // cast to boolean
		return ret;
	}
}

exports.MATH.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of another operation. If the operation is a degenerate case,
	   return NO_OP. */
	if (this.operator == "add" && this.operand == 0)
		return new exports.NO_OP();
	if (this.operator == "rot" && this.operand[0] == 0)
		return new exports.NO_OP();
	if (this.operator == "rot") // ensure the first value is less than the modulus
		return new exports.MATH("rot", [this.operand[0] % this.operand[1], this.operand[1]]);
	if (this.operator == "mult" && this.operand == 1)
		return new exports.NO_OP();
	if (this.operator == "xor" && this.operand == 0)
		return new exports.NO_OP();
	return this;
}

exports.MATH.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	given the state of the document before the operation applies. */
	// The document itself doesn't matter.
	return this.invert();
}

exports.MATH.prototype.invert = function () {
	if (this.operator == "add")
		return new exports.MATH("add", -this.operand);
	if (this.operator == "rot")
		return new exports.MATH("rot", [-this.operand[0], this.operand[1]]);
	if (this.operator == "mult")
		return new exports.MATH("mult", 1.0/this.operand);
	if (this.operator == "xor")
		return this; // is its own inverse
}

exports.MATH.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */

	if (other instanceof exports.MATH) {
		// two adds just add the operands
		if (this.operator == other.operator && this.operator == "add")
			return new exports.MATH("add", this.operand + other.operand).simplify();

		// two rots with the same modulus add the operands
		if (this.operator == other.operator && this.operator == "rot" && this.operand[1] == other.operand[1])
			return new exports.MATH("rot", [this.operand[0] + other.operand[0], this.operand[1]]).simplify();

		// two multiplications multiply the operands
		if (this.operator == other.operator && this.operator == "mult")
			return new exports.MATH("mult", this.operand * other.operand).simplify();

		// two xor's xor the operands
		if (this.operator == other.operator && this.operator == "xor")
			return new exports.MATH("xor", this.operand ^ other.operand).simplify();
	}
	
	return null; // no composition is possible
}

exports.MATH.prototype.rebase_functions = [
	// Rebase this against other and other against this.

	[exports.MATH, function(other, conflictless) {
		// Since the map operators are commutative, it doesn't matter which order
		// they are applied in. That makes the rebase trivial -- if the operators
		// are the same, then nothing needs to be done.
		if (this.operator == other.operator) {
			// rot must have same modulus
			if (this.operator != "rot" || this.operand[1] == other.operand[1])
				return [this, other];
		}

		// If we are given two operators, then we don't know which order they
		// should be applied in. In a conflictless rebase, we can choose on
		// arbitrarily (but predictably). They all operate over numbers so they
		// can be applied in either order, it's just that the resulting value
		// will depend on the order. We sort on both operator and operand because
		// in a rot the operand contains information that distinguishes them.
		if (conflictless) {
			// The one with the lower sort order applies last. So if this has
			// a lower sort order, then when rebasing this we don't make a
			// change. But when rebasing other, we have to undo this, then
			// apply other, then apply this again.
			if (jot.cmp([this.operator, this.operand], [other.operator, other.operand]) < 0) {
				return [
					this,
					jot.LIST([this.invert(), other, this])
				];
			}

			// if cmp == 0, then the operators were the same and we handled
			// it above. if cmp > 0 then we handle this on the call to
			// other.rebase(this).

		}

		return null;
	}]
];

exports.createRandomOp = function(doc, context) {
	// Create a random operation that could apply to doc.
	// Choose uniformly across various options depending on
	// the data type of doc.
	var ops = [];

	// NO_OP is always a possibility.
	ops.push(function() { return new exports.NO_OP() });

	// An identity SET is always a possibility.
	ops.push(function() { return new exports.SET(doc) });

	// Set to null, unless in splice contexts
	if (context != "string-character" && context != "string")
		ops.push(function() { return new exports.SET(null) });

	// Clear the key, if we're in an object.
	if (context == "object")
		ops.push(function() { return new exports.SET(MISSING) });

	// Set to another value of the same type.
	if (typeof doc === "boolean")
		ops.push(function() { return new exports.SET(!doc) });
	if (typeof doc === "number")
		ops.push(function() { return new exports.SET(doc + 50) });
	if (typeof doc === "number")
		ops.push(function() { return new exports.SET(doc / 2.1) });

	if (typeof doc === "string" || Array.isArray(doc)) {
		if (context != "string-character") {
			// Delete (if not already empty).
			if (doc.length > 0)
				ops.push(function() { return new exports.SET(doc.slice(0, 0)) });

			if (doc.length >= 1) {
				// shorten at start
				ops.push(function() { return new exports.SET(doc.slice(Math.floor(Math.random()*(doc.length-1)), doc.length)) });

				// shorten at end
				ops.push(function() { return new exports.SET(doc.slice(0, Math.floor(Math.random()*(doc.length-1)))) });
			}

			if (doc.length >= 2) {
				// shorten by on both sides
				var a = Math.floor(Math.random()*doc.length-1);
				var b = Math.floor(Math.random()*(doc.length-a));
				ops.push(function() { return new exports.SET(doc.slice(a, a+b)) });
			}

			if (doc.length > 0) {
				// expand by copying existing elements from document

				function concat2(item1, item2) {
					if (item1 instanceof String)
						return item1 + item2;
					return item1.concat(item2);
				}
				function concat3(item1, item2, item3) {
					if (item1 instanceof String)
						return item1 + item2 + item3;
					return item1.concat(item2).concat(item3);
				}
			
				// expand by elements at start
				ops.push(function() { return new exports.SET(concat2(doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))), doc)) });
				// expand by elements at end
				ops.push(function() { return new exports.SET(concat2(doc, doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))))); });
				// expand by elements on both sides
				ops.push(function() { return new exports.SET(concat3(doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))), doc, doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))))); });
			} else {
				// expand by generating new elements
				if (typeof doc === "string")
					ops.push(function() { return new exports.SET((Math.random()+"").slice(2)); });
				else if (Array.isArray(doc))
					ops.push(function() { return new exports.SET([null,null,null].map(function() { return Math.random() })); });
			}
		}

		// reverse
		if (doc != doc.split("").reverse().join(""))
			ops.push(function() { return new exports.SET(doc.split("").reverse().join("")); });

		// replace with new elements of the same length
		if (doc.length > 0 && typeof doc === "string") {
			var newvalue = "";
			for (var i = 0; i < doc.length; i++)
				newvalue += (Math.random()+"").slice(2, 3);
			ops.push(function() { return new exports.SET(newvalue); });
		}
	}

	// Math
	if (typeof doc === "number") {
		ops.push(function() { return new exports.MATH("add", 2.5); })
		ops.push(function() { return new exports.MATH("rot", [1, 13]); })
		ops.push(function() { return new exports.MATH("mult", .75); })
		ops.push(function() { return new exports.MATH("xor", 0xFF); })

	}

	// Select randomly.
	return ops[Math.floor(Math.random() * ops.length)]();
}

},{"./index.js":3,"./objects.js":5,"deep-equal":8,"util":31}],8:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}

},{"./lib/is_arguments.js":9,"./lib/keys.js":10}],9:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],10:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],11:[function(require,module,exports){
/*istanbul ignore start*/"use strict";

exports.__esModule = true;
exports. /*istanbul ignore end*/convertChangesToDMP = convertChangesToDMP;
// See: http://code.google.com/p/google-diff-match-patch/wiki/API
function convertChangesToDMP(changes) {
  var ret = [],
      change = /*istanbul ignore start*/void 0 /*istanbul ignore end*/,
      operation = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;
  for (var i = 0; i < changes.length; i++) {
    change = changes[i];
    if (change.added) {
      operation = 1;
    } else if (change.removed) {
      operation = -1;
    } else {
      operation = 0;
    }

    ret.push([operation, change.value]);
  }
  return ret;
}


},{}],12:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports. /*istanbul ignore end*/convertChangesToXML = convertChangesToXML;
function convertChangesToXML(changes) {
  var ret = [];
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    if (change.added) {
      ret.push('<ins>');
    } else if (change.removed) {
      ret.push('<del>');
    }

    ret.push(escapeHTML(change.value));

    if (change.added) {
      ret.push('</ins>');
    } else if (change.removed) {
      ret.push('</del>');
    }
  }
  return ret.join('');
}

function escapeHTML(s) {
  var n = s;
  n = n.replace(/&/g, '&amp;');
  n = n.replace(/</g, '&lt;');
  n = n.replace(/>/g, '&gt;');
  n = n.replace(/"/g, '&quot;');

  return n;
}


},{}],13:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports['default'] = /*istanbul ignore end*/Diff;
function Diff() {}

Diff.prototype = { /*istanbul ignore start*/
  /*istanbul ignore end*/diff: function diff(oldString, newString) {
    /*istanbul ignore start*/var /*istanbul ignore end*/options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var callback = options.callback;
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    this.options = options;

    var self = this;

    function done(value) {
      if (callback) {
        setTimeout(function () {
          callback(undefined, value);
        }, 0);
        return true;
      } else {
        return value;
      }
    }

    // Allow subclasses to massage the input prior to running
    oldString = this.castInput(oldString);
    newString = this.castInput(newString);

    oldString = this.removeEmpty(this.tokenize(oldString));
    newString = this.removeEmpty(this.tokenize(newString));

    var newLen = newString.length,
        oldLen = oldString.length;
    var editLength = 1;
    var maxEditLength = newLen + oldLen;
    var bestPath = [{ newPos: -1, components: [] }];

    // Seed editLength = 0, i.e. the content starts with the same values
    var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
    if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
      // Identity per the equality and tokenizer
      return done([{ value: newString.join(''), count: newString.length }]);
    }

    // Main worker method. checks all permutations of a given edit length for acceptance.
    function execEditLength() {
      for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
        var basePath = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;
        var addPath = bestPath[diagonalPath - 1],
            removePath = bestPath[diagonalPath + 1],
            _oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
        if (addPath) {
          // No one else is going to attempt to use this value, clear it
          bestPath[diagonalPath - 1] = undefined;
        }

        var canAdd = addPath && addPath.newPos + 1 < newLen,
            canRemove = removePath && 0 <= _oldPos && _oldPos < oldLen;
        if (!canAdd && !canRemove) {
          // If this path is a terminal then prune
          bestPath[diagonalPath] = undefined;
          continue;
        }

        // Select the diagonal that we want to branch from. We select the prior
        // path whose position in the new string is the farthest from the origin
        // and does not pass the bounds of the diff graph
        if (!canAdd || canRemove && addPath.newPos < removePath.newPos) {
          basePath = clonePath(removePath);
          self.pushComponent(basePath.components, undefined, true);
        } else {
          basePath = addPath; // No need to clone, we've pulled it from the list
          basePath.newPos++;
          self.pushComponent(basePath.components, true, undefined);
        }

        _oldPos = self.extractCommon(basePath, newString, oldString, diagonalPath);

        // If we have hit the end of both strings, then we are done
        if (basePath.newPos + 1 >= newLen && _oldPos + 1 >= oldLen) {
          return done(buildValues(self, basePath.components, newString, oldString, self.useLongestToken));
        } else {
          // Otherwise track this path as a potential candidate and continue.
          bestPath[diagonalPath] = basePath;
        }
      }

      editLength++;
    }

    // Performs the length of edit iteration. Is a bit fugly as this has to support the
    // sync and async mode which is never fun. Loops over execEditLength until a value
    // is produced.
    if (callback) {
      (function exec() {
        setTimeout(function () {
          // This should not happen, but we want to be safe.
          /* istanbul ignore next */
          if (editLength > maxEditLength) {
            return callback();
          }

          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength) {
        var ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/pushComponent: function pushComponent(components, added, removed) {
    var last = components[components.length - 1];
    if (last && last.added === added && last.removed === removed) {
      // We need to clone here as the component clone operation is just
      // as shallow array clone
      components[components.length - 1] = { count: last.count + 1, added: added, removed: removed };
    } else {
      components.push({ count: 1, added: added, removed: removed });
    }
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
    var newLen = newString.length,
        oldLen = oldString.length,
        newPos = basePath.newPos,
        oldPos = newPos - diagonalPath,
        commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
      newPos++;
      oldPos++;
      commonCount++;
    }

    if (commonCount) {
      basePath.components.push({ count: commonCount });
    }

    basePath.newPos = newPos;
    return oldPos;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/equals: function equals(left, right) {
    return left === right;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/removeEmpty: function removeEmpty(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/castInput: function castInput(value) {
    return value;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/tokenize: function tokenize(value) {
    return value.split('');
  }
};

function buildValues(diff, components, newString, oldString, useLongestToken) {
  var componentPos = 0,
      componentLen = components.length,
      newPos = 0,
      oldPos = 0;

  for (; componentPos < componentLen; componentPos++) {
    var component = components[componentPos];
    if (!component.removed) {
      if (!component.added && useLongestToken) {
        var value = newString.slice(newPos, newPos + component.count);
        value = value.map(function (value, i) {
          var oldValue = oldString[oldPos + i];
          return oldValue.length > value.length ? oldValue : value;
        });

        component.value = value.join('');
      } else {
        component.value = newString.slice(newPos, newPos + component.count).join('');
      }
      newPos += component.count;

      // Common case
      if (!component.added) {
        oldPos += component.count;
      }
    } else {
      component.value = oldString.slice(oldPos, oldPos + component.count).join('');
      oldPos += component.count;

      // Reverse add and remove so removes are output first to match common convention
      // The diffing algorithm is tied to add then remove output and this is the simplest
      // route to get the desired output with minimal overhead.
      if (componentPos && components[componentPos - 1].added) {
        var tmp = components[componentPos - 1];
        components[componentPos - 1] = components[componentPos];
        components[componentPos] = tmp;
      }
    }
  }

  // Special case handle for when one terminal is ignored. For this case we merge the
  // terminal into the prior string and drop the change.
  var lastComponent = components[componentLen - 1];
  if (componentLen > 1 && (lastComponent.added || lastComponent.removed) && diff.equals('', lastComponent.value)) {
    components[componentLen - 2].value += lastComponent.value;
    components.pop();
  }

  return components;
}

function clonePath(path) {
  return { newPos: path.newPos, components: path.components.slice(0) };
}


},{}],14:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.characterDiff = undefined;
exports. /*istanbul ignore end*/diffChars = diffChars;

var /*istanbul ignore start*/_base = require('./base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/var characterDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/characterDiff = new /*istanbul ignore start*/_base2['default']() /*istanbul ignore end*/;
function diffChars(oldStr, newStr, callback) {
  return characterDiff.diff(oldStr, newStr, callback);
}


},{"./base":13}],15:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.cssDiff = undefined;
exports. /*istanbul ignore end*/diffCss = diffCss;

var /*istanbul ignore start*/_base = require('./base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/var cssDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/cssDiff = new /*istanbul ignore start*/_base2['default']() /*istanbul ignore end*/;
cssDiff.tokenize = function (value) {
  return value.split(/([{}:;,]|\s+)/);
};

function diffCss(oldStr, newStr, callback) {
  return cssDiff.diff(oldStr, newStr, callback);
}


},{"./base":13}],16:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.jsonDiff = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports. /*istanbul ignore end*/diffJson = diffJson;
/*istanbul ignore start*/exports. /*istanbul ignore end*/canonicalize = canonicalize;

var /*istanbul ignore start*/_base = require('./base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

/*istanbul ignore end*/
var /*istanbul ignore start*/_line = require('./line') /*istanbul ignore end*/;

/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/

var objectPrototypeToString = Object.prototype.toString;

var jsonDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/jsonDiff = new /*istanbul ignore start*/_base2['default']() /*istanbul ignore end*/;
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
jsonDiff.useLongestToken = true;

jsonDiff.tokenize = /*istanbul ignore start*/_line.lineDiff. /*istanbul ignore end*/tokenize;
jsonDiff.castInput = function (value) {
  return typeof value === 'string' ? value : JSON.stringify(canonicalize(value), undefined, '  ');
};
jsonDiff.equals = function (left, right) {
  return (/*istanbul ignore start*/_base2['default']. /*istanbul ignore end*/prototype.equals(left.replace(/,([\r\n])/g, '$1'), right.replace(/,([\r\n])/g, '$1'))
  );
};

function diffJson(oldObj, newObj, callback) {
  return jsonDiff.diff(oldObj, newObj, callback);
}

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed.
function canonicalize(obj, stack, replacementStack) {
  stack = stack || [];
  replacementStack = replacementStack || [];

  var i = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;

  for (i = 0; i < stack.length; i += 1) {
    if (stack[i] === obj) {
      return replacementStack[i];
    }
  }

  var canonicalizedObj = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;

  if ('[object Array]' === objectPrototypeToString.call(obj)) {
    stack.push(obj);
    canonicalizedObj = new Array(obj.length);
    replacementStack.push(canonicalizedObj);
    for (i = 0; i < obj.length; i += 1) {
      canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack);
    }
    stack.pop();
    replacementStack.pop();
    return canonicalizedObj;
  }

  if (obj && obj.toJSON) {
    obj = obj.toJSON();
  }

  if ( /*istanbul ignore start*/(typeof /*istanbul ignore end*/obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null) {
    stack.push(obj);
    canonicalizedObj = {};
    replacementStack.push(canonicalizedObj);
    var sortedKeys = [],
        key = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;
    for (key in obj) {
      /* istanbul ignore else */
      if (obj.hasOwnProperty(key)) {
        sortedKeys.push(key);
      }
    }
    sortedKeys.sort();
    for (i = 0; i < sortedKeys.length; i += 1) {
      key = sortedKeys[i];
      canonicalizedObj[key] = canonicalize(obj[key], stack, replacementStack);
    }
    stack.pop();
    replacementStack.pop();
  } else {
    canonicalizedObj = obj;
  }
  return canonicalizedObj;
}


},{"./base":13,"./line":17}],17:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.lineDiff = undefined;
exports. /*istanbul ignore end*/diffLines = diffLines;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffTrimmedLines = diffTrimmedLines;

var /*istanbul ignore start*/_base = require('./base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

/*istanbul ignore end*/
var /*istanbul ignore start*/_params = require('../util/params') /*istanbul ignore end*/;

/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/var lineDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/lineDiff = new /*istanbul ignore start*/_base2['default']() /*istanbul ignore end*/;
lineDiff.tokenize = function (value) {
  var retLines = [],
      linesAndNewlines = value.split(/(\n|\r\n)/);

  // Ignore the final empty token that occurs if the string ends with a new line
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }

  // Merge the content and line separators into single tokens
  for (var i = 0; i < linesAndNewlines.length; i++) {
    var line = linesAndNewlines[i];

    if (i % 2 && !this.options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      if (this.options.ignoreWhitespace) {
        line = line.trim();
      }
      retLines.push(line);
    }
  }

  return retLines;
};

function diffLines(oldStr, newStr, callback) {
  return lineDiff.diff(oldStr, newStr, callback);
}
function diffTrimmedLines(oldStr, newStr, callback) {
  var options = /*istanbul ignore start*/(0, _params.generateOptions) /*istanbul ignore end*/(callback, { ignoreWhitespace: true });
  return lineDiff.diff(oldStr, newStr, options);
}


},{"../util/params":25,"./base":13}],18:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.sentenceDiff = undefined;
exports. /*istanbul ignore end*/diffSentences = diffSentences;

var /*istanbul ignore start*/_base = require('./base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/var sentenceDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/sentenceDiff = new /*istanbul ignore start*/_base2['default']() /*istanbul ignore end*/;
sentenceDiff.tokenize = function (value) {
  return value.split(/(\S.+?[.!?])(?=\s+|$)/);
};

function diffSentences(oldStr, newStr, callback) {
  return sentenceDiff.diff(oldStr, newStr, callback);
}


},{"./base":13}],19:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.wordDiff = undefined;
exports. /*istanbul ignore end*/diffWords = diffWords;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffWordsWithSpace = diffWordsWithSpace;

var /*istanbul ignore start*/_base = require('./base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

/*istanbul ignore end*/
var /*istanbul ignore start*/_params = require('../util/params') /*istanbul ignore end*/;

/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/

// Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
//
// Ranges and exceptions:
// Latin-1 Supplement, 0080–00FF
//  - U+00D7  × Multiplication sign
//  - U+00F7  ÷ Division sign
// Latin Extended-A, 0100–017F
// Latin Extended-B, 0180–024F
// IPA Extensions, 0250–02AF
// Spacing Modifier Letters, 02B0–02FF
//  - U+02C7  ˇ &#711;  Caron
//  - U+02D8  ˘ &#728;  Breve
//  - U+02D9  ˙ &#729;  Dot Above
//  - U+02DA  ˚ &#730;  Ring Above
//  - U+02DB  ˛ &#731;  Ogonek
//  - U+02DC  ˜ &#732;  Small Tilde
//  - U+02DD  ˝ &#733;  Double Acute Accent
// Latin Extended Additional, 1E00–1EFF
var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;

var reWhitespace = /\S/;

var wordDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/wordDiff = new /*istanbul ignore start*/_base2['default']() /*istanbul ignore end*/;
wordDiff.equals = function (left, right) {
  return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
};
wordDiff.tokenize = function (value) {
  var tokens = value.split(/(\s+|\b)/);

  // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.
  for (var i = 0; i < tokens.length - 1; i++) {
    // If we have an empty string in the next field and we have only word chars before and after, merge
    if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
      tokens[i] += tokens[i + 2];
      tokens.splice(i + 1, 2);
      i--;
    }
  }

  return tokens;
};

function diffWords(oldStr, newStr, callback) {
  var options = /*istanbul ignore start*/(0, _params.generateOptions) /*istanbul ignore end*/(callback, { ignoreWhitespace: true });
  return wordDiff.diff(oldStr, newStr, options);
}
function diffWordsWithSpace(oldStr, newStr, callback) {
  return wordDiff.diff(oldStr, newStr, callback);
}


},{"../util/params":25,"./base":13}],20:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports.canonicalize = exports.convertChangesToXML = exports.convertChangesToDMP = exports.parsePatch = exports.applyPatches = exports.applyPatch = exports.createPatch = exports.createTwoFilesPatch = exports.structuredPatch = exports.diffJson = exports.diffCss = exports.diffSentences = exports.diffTrimmedLines = exports.diffLines = exports.diffWordsWithSpace = exports.diffWords = exports.diffChars = exports.Diff = undefined;
/*istanbul ignore end*/
var /*istanbul ignore start*/_base = require('./diff/base') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);

/*istanbul ignore end*/
var /*istanbul ignore start*/_character = require('./diff/character') /*istanbul ignore end*/;

var /*istanbul ignore start*/_word = require('./diff/word') /*istanbul ignore end*/;

var /*istanbul ignore start*/_line = require('./diff/line') /*istanbul ignore end*/;

var /*istanbul ignore start*/_sentence = require('./diff/sentence') /*istanbul ignore end*/;

var /*istanbul ignore start*/_css = require('./diff/css') /*istanbul ignore end*/;

var /*istanbul ignore start*/_json = require('./diff/json') /*istanbul ignore end*/;

var /*istanbul ignore start*/_apply = require('./patch/apply') /*istanbul ignore end*/;

var /*istanbul ignore start*/_parse = require('./patch/parse') /*istanbul ignore end*/;

var /*istanbul ignore start*/_create = require('./patch/create') /*istanbul ignore end*/;

var /*istanbul ignore start*/_dmp = require('./convert/dmp') /*istanbul ignore end*/;

var /*istanbul ignore start*/_xml = require('./convert/xml') /*istanbul ignore end*/;

/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/* See LICENSE file for terms of use */

/*
 * Text diff implementation.
 *
 * This library supports the following APIS:
 * JsDiff.diffChars: Character by character diff
 * JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
 * JsDiff.diffLines: Line based diff
 *
 * JsDiff.diffCss: Diff targeted at CSS content
 *
 * These methods are based on the implementation proposed in
 * "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 */
exports. /*istanbul ignore end*/Diff = _base2['default'];
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffChars = _character.diffChars;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffWords = _word.diffWords;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffWordsWithSpace = _word.diffWordsWithSpace;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffLines = _line.diffLines;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffTrimmedLines = _line.diffTrimmedLines;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffSentences = _sentence.diffSentences;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffCss = _css.diffCss;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffJson = _json.diffJson;
/*istanbul ignore start*/exports. /*istanbul ignore end*/structuredPatch = _create.structuredPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createTwoFilesPatch = _create.createTwoFilesPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createPatch = _create.createPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/applyPatch = _apply.applyPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/applyPatches = _apply.applyPatches;
/*istanbul ignore start*/exports. /*istanbul ignore end*/parsePatch = _parse.parsePatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/convertChangesToDMP = _dmp.convertChangesToDMP;
/*istanbul ignore start*/exports. /*istanbul ignore end*/convertChangesToXML = _xml.convertChangesToXML;
/*istanbul ignore start*/exports. /*istanbul ignore end*/canonicalize = _json.canonicalize;


},{"./convert/dmp":11,"./convert/xml":12,"./diff/base":13,"./diff/character":14,"./diff/css":15,"./diff/json":16,"./diff/line":17,"./diff/sentence":18,"./diff/word":19,"./patch/apply":21,"./patch/create":22,"./patch/parse":23}],21:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports. /*istanbul ignore end*/applyPatch = applyPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/applyPatches = applyPatches;

var /*istanbul ignore start*/_parse = require('./parse') /*istanbul ignore end*/;

var /*istanbul ignore start*/_distanceIterator = require('../util/distance-iterator') /*istanbul ignore end*/;

/*istanbul ignore start*/
var _distanceIterator2 = _interopRequireDefault(_distanceIterator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*istanbul ignore end*/function applyPatch(source, uniDiff) {
  /*istanbul ignore start*/var /*istanbul ignore end*/options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  if (typeof uniDiff === 'string') {
    uniDiff = /*istanbul ignore start*/(0, _parse.parsePatch) /*istanbul ignore end*/(uniDiff);
  }

  if (Array.isArray(uniDiff)) {
    if (uniDiff.length > 1) {
      throw new Error('applyPatch only works with a single input.');
    }

    uniDiff = uniDiff[0];
  }

  // Apply the diff to the input
  var lines = source.split('\n'),
      hunks = uniDiff.hunks,
      compareLine = options.compareLine || function (lineNumber, line, operation, patchContent) /*istanbul ignore start*/{
    return (/*istanbul ignore end*/line === patchContent
    );
  },
      errorCount = 0,
      fuzzFactor = options.fuzzFactor || 0,
      minLine = 0,
      offset = 0,
      removeEOFNL = /*istanbul ignore start*/void 0 /*istanbul ignore end*/,
      addEOFNL = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;

  /**
   * Checks if the hunk exactly fits on the provided location
   */
  function hunkFits(hunk, toPos) {
    for (var j = 0; j < hunk.lines.length; j++) {
      var line = hunk.lines[j],
          operation = line[0],
          content = line.substr(1);

      if (operation === ' ' || operation === '-') {
        // Context sanity check
        if (!compareLine(toPos + 1, lines[toPos], operation, content)) {
          errorCount++;

          if (errorCount > fuzzFactor) {
            return false;
          }
        }
        toPos++;
      }
    }

    return true;
  }

  // Search best fit offsets for each hunk based on the previous ones
  for (var i = 0; i < hunks.length; i++) {
    var hunk = hunks[i],
        maxLine = lines.length - hunk.oldLines,
        localOffset = 0,
        toPos = offset + hunk.oldStart - 1;

    var iterator = /*istanbul ignore start*/(0, _distanceIterator2['default']) /*istanbul ignore end*/(toPos, minLine, maxLine);

    for (; localOffset !== undefined; localOffset = iterator()) {
      if (hunkFits(hunk, toPos + localOffset)) {
        hunk.offset = offset += localOffset;
        break;
      }
    }

    if (localOffset === undefined) {
      return false;
    }

    // Set lower text limit to end of the current hunk, so next ones don't try
    // to fit over already patched text
    minLine = hunk.offset + hunk.oldStart + hunk.oldLines;
  }

  // Apply patch hunks
  for (var _i = 0; _i < hunks.length; _i++) {
    var _hunk = hunks[_i],
        _toPos = _hunk.offset + _hunk.newStart - 1;
    if (_hunk.newLines == 0) {
      _toPos++;
    }

    for (var j = 0; j < _hunk.lines.length; j++) {
      var line = _hunk.lines[j],
          operation = line[0],
          content = line.substr(1);

      if (operation === ' ') {
        _toPos++;
      } else if (operation === '-') {
        lines.splice(_toPos, 1);
        /* istanbul ignore else */
      } else if (operation === '+') {
          lines.splice(_toPos, 0, content);
          _toPos++;
        } else if (operation === '\\') {
          var previousOperation = _hunk.lines[j - 1] ? _hunk.lines[j - 1][0] : null;
          if (previousOperation === '+') {
            removeEOFNL = true;
          } else if (previousOperation === '-') {
            addEOFNL = true;
          }
        }
    }
  }

  // Handle EOFNL insertion/removal
  if (removeEOFNL) {
    while (!lines[lines.length - 1]) {
      lines.pop();
    }
  } else if (addEOFNL) {
    lines.push('');
  }
  return lines.join('\n');
}

// Wrapper that supports multiple file patches via callbacks.
function applyPatches(uniDiff, options) {
  if (typeof uniDiff === 'string') {
    uniDiff = /*istanbul ignore start*/(0, _parse.parsePatch) /*istanbul ignore end*/(uniDiff);
  }

  var currentIndex = 0;
  function processIndex() {
    var index = uniDiff[currentIndex++];
    if (!index) {
      return options.complete();
    }

    options.loadFile(index, function (err, data) {
      if (err) {
        return options.complete(err);
      }

      var updatedContent = applyPatch(data, index, options);
      options.patched(index, updatedContent, function (err) {
        if (err) {
          return options.complete(err);
        }

        processIndex();
      });
    });
  }
  processIndex();
}


},{"../util/distance-iterator":24,"./parse":23}],22:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports. /*istanbul ignore end*/structuredPatch = structuredPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createTwoFilesPatch = createTwoFilesPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createPatch = createPatch;

var /*istanbul ignore start*/_line = require('../diff/line') /*istanbul ignore end*/;

/*istanbul ignore start*/
function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*istanbul ignore end*/function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  if (!options) {
    options = { context: 4 };
  }

  var diff = /*istanbul ignore start*/(0, _line.diffLines) /*istanbul ignore end*/(oldStr, newStr);
  diff.push({ value: '', lines: [] }); // Append an empty value to make cleanup easier

  function contextLines(lines) {
    return lines.map(function (entry) {
      return ' ' + entry;
    });
  }

  var hunks = [];
  var oldRangeStart = 0,
      newRangeStart = 0,
      curRange = [],
      oldLine = 1,
      newLine = 1;
  /*istanbul ignore start*/
  var _loop = function _loop( /*istanbul ignore end*/i) {
    var current = diff[i],
        lines = current.lines || current.value.replace(/\n$/, '').split('\n');
    current.lines = lines;

    if (current.added || current.removed) {
      /*istanbul ignore start*/
      var _curRange;

      /*istanbul ignore end*/
      // If we have previous context, start with that
      if (!oldRangeStart) {
        var prev = diff[i - 1];
        oldRangeStart = oldLine;
        newRangeStart = newLine;

        if (prev) {
          curRange = options.context > 0 ? contextLines(prev.lines.slice(-options.context)) : [];
          oldRangeStart -= curRange.length;
          newRangeStart -= curRange.length;
        }
      }

      // Output our changes
      /*istanbul ignore start*/(_curRange = /*istanbul ignore end*/curRange).push. /*istanbul ignore start*/apply /*istanbul ignore end*/( /*istanbul ignore start*/_curRange /*istanbul ignore end*/, /*istanbul ignore start*/_toConsumableArray( /*istanbul ignore end*/lines.map(function (entry) {
        return (current.added ? '+' : '-') + entry;
      })));

      // Track the updated file position
      if (current.added) {
        newLine += lines.length;
      } else {
        oldLine += lines.length;
      }
    } else {
      // Identical context lines. Track line changes
      if (oldRangeStart) {
        // Close out any changes that have been output (or join overlapping)
        if (lines.length <= options.context * 2 && i < diff.length - 2) {
          /*istanbul ignore start*/
          var _curRange2;

          /*istanbul ignore end*/
          // Overlapping
          /*istanbul ignore start*/(_curRange2 = /*istanbul ignore end*/curRange).push. /*istanbul ignore start*/apply /*istanbul ignore end*/( /*istanbul ignore start*/_curRange2 /*istanbul ignore end*/, /*istanbul ignore start*/_toConsumableArray( /*istanbul ignore end*/contextLines(lines)));
        } else {
          /*istanbul ignore start*/
          var _curRange3;

          /*istanbul ignore end*/
          // end the range and output
          var contextSize = Math.min(lines.length, options.context);
          /*istanbul ignore start*/(_curRange3 = /*istanbul ignore end*/curRange).push. /*istanbul ignore start*/apply /*istanbul ignore end*/( /*istanbul ignore start*/_curRange3 /*istanbul ignore end*/, /*istanbul ignore start*/_toConsumableArray( /*istanbul ignore end*/contextLines(lines.slice(0, contextSize))));

          var hunk = {
            oldStart: oldRangeStart,
            oldLines: oldLine - oldRangeStart + contextSize,
            newStart: newRangeStart,
            newLines: newLine - newRangeStart + contextSize,
            lines: curRange
          };
          if (i >= diff.length - 2 && lines.length <= options.context) {
            // EOF is inside this hunk
            var oldEOFNewline = /\n$/.test(oldStr);
            var newEOFNewline = /\n$/.test(newStr);
            if (lines.length == 0 && !oldEOFNewline) {
              // special case: old has no eol and no trailing context; no-nl can end up before adds
              curRange.splice(hunk.oldLines, 0, '\\ No newline at end of file');
            } else if (!oldEOFNewline || !newEOFNewline) {
              curRange.push('\\ No newline at end of file');
            }
          }
          hunks.push(hunk);

          oldRangeStart = 0;
          newRangeStart = 0;
          curRange = [];
        }
      }
      oldLine += lines.length;
      newLine += lines.length;
    }
  };

  for (var i = 0; i < diff.length; i++) {
    /*istanbul ignore start*/
    _loop( /*istanbul ignore end*/i);
  }

  return {
    oldFileName: oldFileName, newFileName: newFileName,
    oldHeader: oldHeader, newHeader: newHeader,
    hunks: hunks
  };
}

function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  var diff = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);

  var ret = [];
  if (oldFileName == newFileName) {
    ret.push('Index: ' + oldFileName);
  }
  ret.push('===================================================================');
  ret.push('--- ' + diff.oldFileName + (typeof diff.oldHeader === 'undefined' ? '' : '\t' + diff.oldHeader));
  ret.push('+++ ' + diff.newFileName + (typeof diff.newHeader === 'undefined' ? '' : '\t' + diff.newHeader));

  for (var i = 0; i < diff.hunks.length; i++) {
    var hunk = diff.hunks[i];
    ret.push('@@ -' + hunk.oldStart + ',' + hunk.oldLines + ' +' + hunk.newStart + ',' + hunk.newLines + ' @@');
    ret.push.apply(ret, hunk.lines);
  }

  return ret.join('\n') + '\n';
}

function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
  return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
}


},{"../diff/line":17}],23:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports. /*istanbul ignore end*/parsePatch = parsePatch;
function parsePatch(uniDiff) {
  /*istanbul ignore start*/var /*istanbul ignore end*/options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var diffstr = uniDiff.split('\n'),
      list = [],
      i = 0;

  function parseIndex() {
    var index = {};
    list.push(index);

    // Parse diff metadata
    while (i < diffstr.length) {
      var line = diffstr[i];

      // File header found, end parsing diff metadata
      if (/^(\-\-\-|\+\+\+|@@)\s/.test(line)) {
        break;
      }

      // Diff index
      var header = /^(?:Index:|diff(?: -r \w+)+)\s+(.+?)\s*$/.exec(line);
      if (header) {
        index.index = header[1];
      }

      i++;
    }

    // Parse file headers if they are defined. Unified diff requires them, but
    // there's no technical issues to have an isolated hunk without file header
    parseFileHeader(index);
    parseFileHeader(index);

    // Parse hunks
    index.hunks = [];

    while (i < diffstr.length) {
      var _line = diffstr[i];

      if (/^(Index:|diff|\-\-\-|\+\+\+)\s/.test(_line)) {
        break;
      } else if (/^@@/.test(_line)) {
        index.hunks.push(parseHunk());
      } else if (_line && options.strict) {
        // Ignore unexpected content unless in strict mode
        throw new Error('Unknown line ' + (i + 1) + ' ' + JSON.stringify(_line));
      } else {
        i++;
      }
    }
  }

  // Parses the --- and +++ headers, if none are found, no lines
  // are consumed.
  function parseFileHeader(index) {
    var headerPattern = /^(---|\+\+\+)\s+([\S ]*)(?:\t(.*?)\s*)?$/;
    var fileHeader = headerPattern.exec(diffstr[i]);
    if (fileHeader) {
      var keyPrefix = fileHeader[1] === '---' ? 'old' : 'new';
      index[keyPrefix + 'FileName'] = fileHeader[2];
      index[keyPrefix + 'Header'] = fileHeader[3];

      i++;
    }
  }

  // Parses a hunk
  // This assumes that we are at the start of a hunk.
  function parseHunk() {
    var chunkHeaderIndex = i,
        chunkHeaderLine = diffstr[i++],
        chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    var hunk = {
      oldStart: +chunkHeader[1],
      oldLines: +chunkHeader[2] || 1,
      newStart: +chunkHeader[3],
      newLines: +chunkHeader[4] || 1,
      lines: []
    };

    var addCount = 0,
        removeCount = 0;
    for (; i < diffstr.length; i++) {
      // Lines starting with '---' could be mistaken for the "remove line" operation
      // But they could be the header for the next file. Therefore prune such cases out.
      if (diffstr[i].indexOf('--- ') === 0 && i + 2 < diffstr.length && diffstr[i + 1].indexOf('+++ ') === 0 && diffstr[i + 2].indexOf('@@') === 0) {
        break;
      }
      var operation = diffstr[i][0];

      if (operation === '+' || operation === '-' || operation === ' ' || operation === '\\') {
        hunk.lines.push(diffstr[i]);

        if (operation === '+') {
          addCount++;
        } else if (operation === '-') {
          removeCount++;
        } else if (operation === ' ') {
          addCount++;
          removeCount++;
        }
      } else {
        break;
      }
    }

    // Handle the empty block count case
    if (!addCount && hunk.newLines === 1) {
      hunk.newLines = 0;
    }
    if (!removeCount && hunk.oldLines === 1) {
      hunk.oldLines = 0;
    }

    // Perform optional sanity checking
    if (options.strict) {
      if (addCount !== hunk.newLines) {
        throw new Error('Added line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
      }
      if (removeCount !== hunk.oldLines) {
        throw new Error('Removed line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
      }
    }

    return hunk;
  }

  while (i < diffstr.length) {
    parseIndex();
  }

  return list;
}


},{}],24:[function(require,module,exports){
/*istanbul ignore start*/"use strict";

exports.__esModule = true;

exports["default"] = /*istanbul ignore end*/function (start, minLine, maxLine) {
  var wantForward = true,
      backwardExhausted = false,
      forwardExhausted = false,
      localOffset = 1;

  return function iterator() {
    if (wantForward && !forwardExhausted) {
      if (backwardExhausted) {
        localOffset++;
      } else {
        wantForward = false;
      }

      // Check if trying to fit beyond text length, and if not, check it fits
      // after offset location (or desired location on first iteration)
      if (start + localOffset <= maxLine) {
        return localOffset;
      }

      forwardExhausted = true;
    }

    if (!backwardExhausted) {
      if (!forwardExhausted) {
        wantForward = true;
      }

      // Check if trying to fit before text beginning, and if not, check it fits
      // before offset location
      if (minLine <= start - localOffset) {
        return -localOffset++;
      }

      backwardExhausted = true;
      return iterator();
    }

    // We tried to fit hunk before text beginning and beyond text lenght, then
    // hunk can't fit on the text. Return undefined
  };
};


},{}],25:[function(require,module,exports){
/*istanbul ignore start*/'use strict';

exports.__esModule = true;
exports. /*istanbul ignore end*/generateOptions = generateOptions;
function generateOptions(options, defaults) {
  if (typeof options === 'function') {
    defaults.callback = options;
  } else if (options) {
    for (var name in options) {
      /* istanbul ignore else */
      if (options.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
  }
  return defaults;
}


},{}],26:[function(require,module,exports){
'use strict'

module.exports = diff

var assign = require('object-assign')

/**
 * diff(a, b [, eql]) diffs the array-like objects `a` and `b`, returning
 * a summary of the edits made. By default, strict equality (`===`) is
 * used to compare items in `a` and `b`; if this will not work (for example,
 * if the items in `a` and `b` are objects), a custom equality function,
 * `eql`, may be passed as a third argument.
 *
 * @param {Array} a
 * @param {Array} b
 * @param {Function} eql
 * @return {Array}
 */
function diff (a, b, eql) {
  eql = eql || strictEqual

  var N = a.length
  var M = b.length
  var MAX = N + M

  var V = {}
  var Vs = []

  V[1] = 0
  for (var D = 0; D <= MAX; D += 1) {
    for (var k = -D; k <= D; k += 2) {
      var x, y

      if (k === -D || (k !== D && V[k - 1] < V[k + 1])) {
        x = V[k + 1]
      } else {
        x = V[k - 1] + 1
      }

      y = x - k
      while (x < N && y < M && eql(a[x], b[y])) {
        x += 1
        y += 1
      }

      V[k] = x
      if (x >= N && y >= M) {
        Vs[D] = assign({}, V)
        return buildEdits(Vs, a, b)
      }
    }

    Vs[D] = assign({}, V)
  }

  // ?
  throw Error('Unreachable diff path reached')
}

// Used when no equality function is given to diff()
function strictEqual (a, b) {
  return a === b
}

/**
 * buildEdits(Vs, a, b) builds an array of edits from the edit graph,
 * `Vs`, of `a` and `b`.
 *
 * @param {Array} Vs
 * @param {Array} a
 * @param {Array} b
 * @return {Array}
 */
function buildEdits (Vs, a, b) {
  var edits = []

  var p = { x: a.length, y: b.length }
  for (var D = Vs.length - 1; p.x > 0 || p.y > 0; D -= 1) {
    var V = Vs[D]
    var k = p.x - p.y

    var xEnd = V[k]

    var down = (k === -D || (k !== D && V[k - 1] < V[k + 1]))
    var kPrev = down ? k + 1 : k - 1

    var xStart = V[kPrev]
    var yStart = xStart - kPrev

    var xMid = down ? xStart : xStart + 1

    while (xEnd > xMid) {
      pushEdit(edits, a[xEnd - 1], false, false)
      xEnd -= 1
    }

    if (yStart < 0) break

    if (down) {
      pushEdit(edits, b[yStart], true, false)
    } else {
      pushEdit(edits, a[xStart], false, true)
    }

    p.x = xStart
    p.y = yStart
  }

  return edits.reverse()
}

/**
 * pushEdit(edits, item, added, removed) adds the given item to the array
 * of edits. Similar edits are grouped together for conciseness.
 *
 * @param {Array} edits
 * @param {*} item
 * @param {Boolean} added
 * @param {Boolean} removed
 */
function pushEdit (edits, item, added, removed) {
  var last = edits[edits.length - 1]

  if (last && last.added === added && last.removed === removed) {
    last.items.unshift(item) // Not push: edits get reversed later
  } else {
    edits.push({
      items: [item],
      added: added,
      removed: removed
    })
  }
}

},{"object-assign":27}],27:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			to[keys[i]] = from[keys[i]];
		}
	}

	return to;
};

},{}],28:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],29:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],30:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],31:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":30,"_process":28,"inherits":29}]},{},[1]);
