class User {
    constructor(id, email, name, pp, isInitiator) {
        this.id = id;
        this.email = email
        this.pp = pp
        this.name = name;
        this.isInitiator = isInitiator;
    }
}

module.exports = User;
