import {Parser} from "acorn";
import {generate}  from "astring";
import { defaultTraveler, attachComments, makeTraveler } from 'astravel';

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
     			allowReserved: true,
     			allowAwaitOutsideFunction: true,
     			ecmaVersion: "latest",
        }
      );
        
		// find the places to change.
    audioTraveler.go(ast, {});
    
    return audioFound;
  }
	
export {lookForAudioObjectUse}