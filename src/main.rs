extern crate dotenv;
extern crate dotenv_codegen;

use serde::{Deserialize, Serialize};
use serde_json::Result;

use dotenv::dotenv; //env variables

use std::env;
use std::io::prelude::*;
use std::net::TcpListener;
use std::net::TcpStream;
use std::fs;


#[derive(Serialize, Deserialize)]
struct Node {
    intent: i16,
    peers: Vec<String>,
    parent: String,
}


fn start_server (port:u16) {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();

    let n_data = String::from(fs::read_to_string("node_data.json").unwrap()); //loads saved node data
    let mut node = serde_json::from_str(&n_data).unwrap();

    for stream in listener.incoming() {
        let stream = stream.unwrap();
        handle_connection(stream, &mut node);
    }
}



fn handle_connection(mut stream: TcpStream, node: &mut Node) {
    let mut buffer = [0; 1024];
    let get = b"GET / HTTP/1.1\r\n"; //GET header constant

    stream.read(&mut buffer).unwrap();

    if buffer.starts_with(get) {
        let contents = String::from(format!("JACKAL Client v{}\n\nNode Stats:\n\tParent:\t{}\n\tPeers:\t{:#?}", dotenv_codegen::dotenv!("VERSION"), node.parent, node.peers));

        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{}",
            contents.len(),
            contents
        );

        stream.write(response.as_bytes()).unwrap();
        stream.flush().unwrap();
        
    } else {
        //TODO add functionality for other types of requests.
    }
}

fn main() {
    let port = dotenv_codegen::dotenv!("PORT").parse::<u16>().unwrap();
    start_server(port);
}