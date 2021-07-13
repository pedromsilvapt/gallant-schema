import * as schema from '../main';

export interface Request {
    username: string;
    password: string & schema.MinLen<8>;
    email: string & schema.Email;
    birthdate: Date;
}
