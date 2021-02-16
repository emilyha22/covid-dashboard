require('dotenv').config()
const chai = require('chai');
const { expect, assert, should } = chai;


/**
 * Using Chai HTTP
 * @url https://www.chaijs.com/plugins/chai-http/
 */
const chaiHttp = require('chai-http');
chai.use(chaiHttp);


describe('Endpoint: importWastewaterData', function(){

  const server = 'http://localhost:5001';
  const endpoint = '/covid-dashboard-f47ce/us-central1/importWastewaterData'
  
  // Since we're online, kill the timeout for this test
  this.timeout(0);

  it('should import sample records successfully', (done) => {
    chai.request(server)
    .post(endpoint)
    .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        assert(res.text === 'Samples were imported successfully.', 'Response text does not match')
        done();
    });
  });

  it('should reject any non-POST request', (done) => {
    chai.request(server)
    .get(endpoint)
    .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(403);
        done();
    });
  });
});