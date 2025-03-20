import {Parser} from "acorn";
import {generate}  from "astring";
import { defaultTraveler, attachComments, makeTraveler } from 'astravel';

const watchListArray = ["time", "fps"];
const watchList = new Set(watchListArray);

// Function to convert all instances of global variables on the watchlist to be
// preceeded by a prefix like "_h.", which converts from a global variable to a member expression
// We do all this because the JS function creator captures primitive types as initial values rather than as changeable variables.

function Deglobalize(text, prefix) {
	
	 const ignore = Function.prototype;
	 let traveler = makeTraveler({
  	go: function(node, state) {
        if (node.type === 'Identifier') {
					if (watchList.has(node.name)) {
            	state.refTab.push(node);
       		 }
      }
        // Call the parent's `go` method
        this.super.go.call(this, node, state);
      },
     //MemberExpression: ignore
    });

        // Parse to AST
   var comments = [];
   let ast = Parser.parse(text, {
     			locations: false,
     			ecmaVersion: "latest",
          onComment: comments
        }
      );
        
		let state = {
    	refTab: []
		}
				// find the places to change.
    		traveler.go(ast, state);
 
    		// If none found, just return the input.
    	 if (state.refTab.length === 0) return text;

			 for (let i = 0; i < state.refTab.length; ++i) {
			 		let node = state.refTab[i];
			 		let vn = node.name;
			 		node.name = prefix + '.' + vn; // can you say hack!
			 		/*
			 		node.type = "MemberExpression";
			 		delete node.name;
			 		node.object = {"type": "identifier", "name": prefix};
			 		node.property = {"type": "identifier", "name": vn};
			 		node.computed = false;
			 		node.optional = false;
			 		*/
			 }

        // Put the comments back.
        //attachComments(ast, comments);
        let regen = generate(ast);
        return regen;
}

function lookForAudioObjectUse(text) {
	let audioFound = false;
	
	 let audioTraveler = makeTraveler({
  	go: function(node, state) {
        if (node.type === 'Identifier') {
        	if (node.name === 'a') {
        		audioFound = true;
        	}
      }
        // Call the parent's `go` method
        this.super.go.call(this, node, state);
      }
     //MemberExpression: ignore
    });

   let ast = Parser.parse(text, {
     			locations: false,
     			ecmaVersion: "latest",
        }
      );
        
		// find the places to change.
    audioTraveler.go(ast, {});
    
    return audioFound;
  }
	
export {Deglobalize, lookForAudioObjectUse}