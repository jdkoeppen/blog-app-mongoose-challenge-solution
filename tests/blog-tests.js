'use strict';

const chai = require('chai')
const chaiHttp = require('chai-http');
const faker = require('faker')
const mongoose = require('mongoose');
const should = chai.should();

const {BlogPost} = require('../models');
const {closeServer, runServer, app} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Disconnecting DB');
        mongoose.connection.dropDatabase()
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
}

function seedBlogPostData() {
    console.log('Seeding post data');
    const seedData = [];
    for(i = 1; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName,
                lastName: faker.name.lastName
            },
            title: faker.lorem.sentence,
            content: faker.lorem.text,
        });
    }
    return BlogPost.insertMany(seedData);
}

describe('blog post API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });
    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
        it('should return all existing posts', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(_res => {
                res = _res;
                res.should.have.status(200);
                res.body.should.have.lengthOf.at.least(1);
                return BlogPost.count();  
            })
            .then(count => {
                res.body.should.have.lengthOf(count);
            });
        });
        it('should return posts with correct fields', function() {
            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.lengthOf.at.least(1);

                res.body.forEach(function(post) {
                    post.should.be.a('object');
                    post.should.include.keys('id', 'title', 'content', 'author','created');
                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(post => {
                resPost.title.should.equal(post.title);
                resPost.content.should.equal(post.content);
                resPost.author.should.equal(post.author);
            });
        });
    });

    describe('POST endpoint', function() {
        it('should add a new blog post', function() {
            const newPost = {
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName()
                },
                content: faker.lorem.text(),
            };
            return chai.request(app) 
            .post('/posts')
            .send(newPost)
            .then(function(res) {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object')
                res.body.should.include.keys("id", "title", "content", "author", "created");
                res.body.title.should.equal(newPost.title);
                res.body.id.should.not.be.null;
                res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
                res.body.content.should.equal(newPost.content);
                return BlogPost.findById(res.body.id)
            })
            .then(function(post) {
                post.title.should.equal(newPost.title);
                post.content.should.equal(newPost.content);
                post.author.firstName.should.equal(newPost.author.firstName);
                post.author.lastName.should.equal(newPost.author.lastName);
            });
        });
    });

    describe('PUT endpoint', function() {
        it('should update an existing post', function() {
            const updateData = {
                title: 'Every Kind of Mustard',
                content: 'Ketchup',
                author: {
                    firstName: 'Juan',
                    lastName: 'Cena'
                },
            };

            return BlogPost
            .findOne()
            .then(post => {
                updateData.id = post.id;
                
                return chai.request(app)
                .put(`/post/${post.id}`)
                .send(updateData);
            })
            .then(res => {
                res.should.have.status(204);
                return BlogPost.findById(updateData.id);
            })
            .then(post => {
                post.title.should.equal(updateData.title);
                post.content.should.equal(updateData.content);
                post.author.firstName.should.equal(updateData.author.firstName);
                post.author.lastName.should.equal(updateData.author.lastName);
            });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete a post by Id', function() {
            let post;
            return BlogPost
            .findOne()
            .then(_post => {
                post = _post;
                return chai.request(app).delete(`/post/${post.id}`)
            })
            .then(_post => {
                should.not.exist(_post);
            });
        });
    });
});

