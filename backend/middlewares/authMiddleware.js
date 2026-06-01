const jwt = require("jsonwebtoken")
require("dotenv").config();


exports.auth = (req, res, next) => {  //this issue came when i tried to access token in community section to ask problems so i have to change the method to extract token
    try {

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        // Check if the header exists and is in the correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Token missing or malformed header"
            });
        }

        // Get the token part (remove "Bearer ")
        const token = authHeader.split(' ')[1];
        

        // Verify the token
        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log("Decoded JWT Payload:", decode); // Good for debugging
            req.user = decode; // Attach decoded payload to request object
        } catch (e) {
            return res.status(401).json({
                success: false,
                message: "Token is invalid"
            });
        }

        next();
    } catch (err) {
        console.error("Error in auth middleware:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while verifying token"
        });
    }
};

exports.isDoctor = (req, res, next) => {
    try {
        if (req.user.role !== "Doctor") {
            return res.status(401).json({
                success: false,
                message: "This is a protect route for Doctors, you can not access it"
            })
        }
        next();
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "User Role is not Matching"
        })
    }
}

exports.isPatient = (req, res, next) => {
    try {
        if (req.user.role !== "Patient") {
            return res.status(401).json({
                success: false,
                message: "This is a protect route for Patients,you can not access it"
            })
        }
        next();
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "User Role is not Matching"
        })
    }
}

// exports.auth = (req, res, next) => {
//     try {
//         const token = req.body.token;
//         // const token = req.cookie.token 

//         if (!token) {
//             return res.status(401).json({
//                 success: false,
//                 message: "token missing"
//             })
//         }

//         // verify the token 
//         try {
//             const decode = jwt.verify(token, process.env.JWT_SECRET);

//             console.log(decode)

//             req.user = decode;
//         }
//         catch (e) {
//             return res.status(401).json({
//                 success: false,
//                 message: "token is invalid"
//             })
//         }

//         next();
//     }
//     catch (err) {
//         console.log(err)
//         return res.status(401).json({
//             success: false,
//             message: "Something went wrong while verifying token"
//         })
//     }
// }