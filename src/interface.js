

function main() {
    
    let request = require('request')

    let options = {
        url: 'http://172.17.0.2:7777',
        method: 'post',
        headers: {
        'content-type': 'application/json'
        }
    };

    request(options, (error, response, body) => {
    if (error) {
        console.error('Error: ', error)
    } else {
        console.log('Response: ', body)
    }
    });

}

main();