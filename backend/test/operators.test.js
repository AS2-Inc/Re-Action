
import { jest } from "@jest/globals";
import request from "supertest";

// Mock EmailService
const mockSendActivationEmail = jest.fn();
jest.unstable_mockModule("../app/services/email_service.js", () => ({
    default: {
        send_activation_email: mockSendActivationEmail,
    },
}));

// Mock Operator Model
const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockSave = jest.fn();
const mockCreate = jest.fn();
const mockDeleteMany = jest.fn();

class MockOperator {
    constructor(data) {
        Object.assign(this, data);
        this.save = mockSave;
    }
}
// Attach static methods
MockOperator.findOne = mockFindOne;
MockOperator.findById = mockFindById;
MockOperator.create = mockCreate;
MockOperator.deleteMany = mockDeleteMany;
// Mongoose specific
MockOperator.schema = { obj: {} };

jest.unstable_mockModule("../app/models/operator.js", () => ({
    default: MockOperator,
}));

// Import App and other dependencies using dynamic import to support hoisting
let app;
let jwt;
let bcrypt;

describe("Operator API (Mocked DB)", () => {
    let admin_token;
    let operator_data;
    let operator_id = "mock_operator_id";
    let activation_token = "mock_activation_token";

    beforeAll(async () => {
        app = (await import("../app/app.js")).default;
        jwt = (await import("jsonwebtoken")).default;
        bcrypt = (await import("bcrypt")).default;

        // Setup tokens without real DB
        process.env.SUPER_SECRET = "test-secret";

        admin_token = jwt.sign(
            { email: "admin@test.com", id: "admin123", role: "admin" },
            process.env.SUPER_SECRET,
            { expiresIn: 86400 }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default mock implementations if needed
        mockSave.mockResolvedValue(true);
    });

    describe("POST /api/v1/operators/register", () => {
        it("should allow admin to register a new operator", async () => {
            operator_data = {
                name: "Op",
                surname: "Test",
                email: "op@test.com",
            };

            // Mock: No existing user
            mockFindOne.mockResolvedValue(null);

            // Mock: Save returns the object (augmented)
            mockSave.mockImplementation(function () {
                this._id = operator_id;
                this.activation_token = activation_token;
                return Promise.resolve(this);
            });

            const response = await request(app)
                .post("/api/v1/operators/register")
                .set("x-access-token", admin_token)
                .send(operator_data);

            expect(response.status).toBe(201);
            expect(mockSendActivationEmail).toHaveBeenCalledWith(operator_data.email, expect.any(String));
            expect(mockFindOne).toHaveBeenCalledWith({ email: operator_data.email });
        });

        it("should return 409 if email already exists", async () => {
            mockFindOne.mockResolvedValue({ _id: "existing" });

            const response = await request(app)
                .post("/api/v1/operators/register")
                .set("x-access-token", admin_token)
                .send({
                    name: "Op",
                    surname: "Test",
                    email: "existing@test.com",
                });

            expect(response.status).toBe(409);
        });

        it("should forbid non-admin from registering operator", async () => {
            const non_admin_token = jwt.sign(
                { email: "user@test.com", id: "user123", role: "operator" },
                process.env.SUPER_SECRET,
                { expiresIn: 86400 }
            );

            const response = await request(app)
                .post("/api/v1/operators/register")
                .set("x-access-token", non_admin_token)
                .send(operator_data);

            expect(response.status).toBe(403);
        });
    });

    describe("POST /api/v1/operators/activate", () => {
        it("should activate operator with valid token and strong password", async () => {
            const mockOp = {
                _id: operator_id,
                email: "op@test.com",
                role: "operator",
                activation_token: activation_token,
                save: mockSave,
            };

            mockFindOne.mockResolvedValue(mockOp);
            mockSave.mockResolvedValue(mockOp);

            const response = await request(app)
                .post("/api/v1/operators/activate")
                .send({
                    token: activation_token,
                    password: "StrongPassword123!",
                });

            expect(response.status).toBe(200);
            expect(mockOp.is_active).toBe(true);
            expect(mockOp.password).not.toBe("StrongPassword123!"); // Should be hashed
            expect(mockSave).toHaveBeenCalled();
        });

        it("should fail with weak password", async () => {
            const response = await request(app)
                .post("/api/v1/operators/activate")
                .send({
                    token: activation_token,
                    password: "123",
                });

            expect(response.status).toBe(400); // Bad Request
            expect(response.body.error).toMatch(/weak/i);
            // findOne should not be called? Logic checks password strength first.
        });

        it("should fail if token invalid", async () => {
            mockFindOne.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/v1/operators/activate")
                .send({
                    token: "invalid",
                    password: "StrongPassword123!",
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/invalid/i);
        });
    });

    describe("POST /api/v1/operators/login", () => {
        // We need to verify password checking.
        // Since we are mocking Operator, we need to make sure the object's password matches what bcrypt expects or mock bcrypt.
        // Ideally we shouldn't mock bcrypt here unless necessary, but let's see.
        // We can create a real hash for the mock.

        // bcrypt already imported in beforeAll

        it("should login with valid credentials", async () => {
            const hashedPassword = await bcrypt.hash("StrongPassword123!", 10);

            const mockOp = {
                _id: operator_id,
                email: "op@test.com",
                password: hashedPassword,
                role: "operator",
                is_active: true,
                exec: jest.fn().mockReturnValue(Promise.resolve({ // findOne returns query, need exec?
                    _id: operator_id,
                    email: "op@test.com",
                    password: hashedPassword,
                    role: "operator",
                    is_active: true
                }))
            };
            // app/routers/operators.js uses .exec() after findOne
            // const operator = await Operator.findOne({ ... }).exec();

            mockFindOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockOp)
            });

            const response = await request(app)
                .post("/api/v1/operators/login")
                .send({
                    email: "op@test.com",
                    password: "StrongPassword123!",
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("token");
        });

        it("should fail with invalid credentials", async () => {
            const hashedPassword = await bcrypt.hash("StrongPassword123!", 10);

            mockFindOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    _id: operator_id,
                    email: "op@test.com",
                    password: hashedPassword,
                    role: "operator",
                    is_active: true
                })
            });

            const response = await request(app)
                .post("/api/v1/operators/login")
                .send({
                    email: "op@test.com",
                    password: "WrongPassword!",
                });

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/v1/operators/me", () => {
        let op_token;

        beforeAll(() => {
            op_token = jwt.sign(
                { email: "op@test.com", id: operator_id, role: "operator" },
                process.env.SUPER_SECRET,
                { expiresIn: 86400 }
            );
        });

        it("should return operator details", async () => {
            mockFindOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    name: "Op",
                    surname: "Test",
                    email: "op@test.com",
                    role: "operator"
                })
            });

            const response = await request(app)
                .get("/api/v1/operators/me")
                .set("x-access-token", op_token);

            expect(response.status).toBe(200);
            expect(response.body.name).toBe("Op");
        });
    });
});
