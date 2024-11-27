// const { decryptData, encryptData } = require("./utility");
var express = require("express");
const cors = require("cors");
var mysql = require("mysql");
var app = express();
const { Client } = require("pg");
const bodyParser = require("body-parser");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const cron = require('node-cron');
app.use(bodyParser.json());
app.use(express.json());

const multer = require('multer');
const fs = require('fs')
const path = require('path');
app.use(bodyParser.json({ limit: '10mb' })); // Limit request body size to 10MB
app.use(cors({
   origin: 'https://vrv-frontend-alpha.vercel.app', // Set the origin to allow requests from
  // origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS','DELETE','PUT'], // Set allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Set allowed headers
  credentials: true // Allow credentials (cookies, authorization headers)
}));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Node app listening on port ${port}!`));
const { addListener } = require("nodemon");
const { application, response } = require("express");
const connection = new Client({
    user: "postgres.adbusyzbvzlgetciiwso",
    password: "Biltz123@990",
    database: "postgres",
    port: 5432,
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    ssl: { rejectUnauthorized: false },
  });
  
connection.connect()
  .then(() => {
    console.log("Connected!!!");
  })
  .catch((error) => {
    console.error("Connection error:", error);
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const formattedDate = date.toISOString().split('T')[0];
  return formattedDate;
}

function formatDateToDDMMYYYY(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
}
function incrementDate(dateString) {
  const [day, month, year] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); 
  date.setDate(date.getDate() + 1);
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;

  return formattedDate;
}
app.post('/userlogin', async (req, res) => {
  try {
    const { name, password } = req.body;
    const query = 'select * from userdata_vrv where username = $1 and password = $2';
    const result = await connection.query(query, [name, password]);
    if (result.rows.length === 1) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect username or password' });
    }
  } catch (error) {
    console.error('Error executing login query:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.put('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, username, department, designation, dateofjoining } = req.body;
  try {
   const result = await connection.query('update userdata_vrv set name = $1, username = $2, department = $3, designation = $4, dateofjoining = $5 where id = $6',
      [name, username, department, designation, dateofjoining, userId]
    );

    res.status(200).json({ message: 'User information updated successfully' });
  } catch (error) {
    console.error('Error updating user information:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.post('/resetpassword', async (req, res) => {
  try {
    console.log(req.body)
    const { email, newPassword } = req.body;
    const query = 'SELECT username FROM userdata_vrv WHERE username = $1';
    const results = await connection.query(query, [email]);
    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const updateQuery = 'UPDATE userdata_vrv SET password = $1, confirmpassword = $2 WHERE username = $3';
    await connection.query(updateQuery, [newPassword, newPassword, email]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/adminlogin', async (req, res) => {
  try {
    const { name, password } = req.body;
    const results = await new Promise((resolve, reject) => {
      connection.query('select * from adminlms_vrv where username = $1 and password = $2', [name, password], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    if (results.rows.length > 0) {
      res.status(200).json({ success: true, admin: results.rows[0] }); 
    } else {
      res.status(401).json({ success: false, message: 'Invalid adminname or password' }); 
    }
  } catch (error) {
    res.status(500).send('Error in database query');
  }
});


app.get('/userProfiles', async (req, res) => {
  try {
    const sql = 'select * from userdata_vrv;';
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching user profiles:', err);
        res.status(500).json({ error: 'An error occurred while fetching user profiles' });
      } else {
        res.json(result.rows);
      }
    });
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'An error occurred while fetching user profiles' });
  }
});
app.get('/userProfiles/:userId', async (req, res) => {
  try {
    const userId =  req.params.userId; 
    const sql = `select * from userdata_vrv where emp_code = $1`;
    connection.query(sql, [userId], (err, result) => {
      if (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: 'An error occurred while fetching user profile' });
      } else {
        if (result.length === 0) {
          res.status(404).json({ error: 'User profile not found' });
        } else {
          res.json(result.rows[0]); 
        }
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'An error occurred while fetching user profile' });
  }
});

const diskstorage = multer.diskStorage({
  destination: path.join(__dirname, '../images'),
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-monkeywit-' + file.originalname)
  }
})

const fileUpload = multer({
  storage: diskstorage
}).single('image')


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/images/post', fileUpload, async (req, res) => {
    try {
        const type = req.file.mimetype;
        const name = req.file.originalname;
        const data = fs.readFileSync(path.join(__dirname, '../images/' + req.file.filename));
        const imageUrl = req.body.imageUrl;
        const query = 'INSERT INTO images (type, name, data, imageurl) VALUES ($1, $2, $3, $4)';
        await connection.query(query, [type, name, data, imageUrl]);

        res.send('Image saved!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/upload-and-save-employee', upload.single('image'), (req, res) => {
  const formData = req.body;
  const file = req.file;

  // Update the SQL query to include the new columns
  const sql = `INSERT INTO userdata_vrv (
      emp_code, username, password, confirmpassword, 
      name, dateofjoining, designation, department, 
      data, dob, total_leaves, taking_leaves, balance_leave
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

  // Add default values for the new columns in the values array
  const values = [
    formData.emp_code,
    formData.username,
    formData.password,
    formData.confirmPassword,
    formData.name,
    formData.dateOfJoining,
    formData.designation,
    formData.department,
    file.buffer,
    formData.dob,
    0, // total_leaves default value
    0, // taking_leaves default value
    0  // balance_leave default value
  ];

  // Execute the query
  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting employee details into database:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    console.log('Employee details inserted into database');
    res.status(200).json({ message: 'Employee details saved successfully' });
  });
});

app.get('/get-employee-image/:emp_code', (req, res) => {
  const empCode = req.params.emp_code;
  const sql = 'SELECT image_path FROM userdata_vrv WHERE emp_code = $1';

  connection.query(sql, [empCode], (err, result) => {
    if (err) {
      console.error('Error fetching image path from database:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (result.length === 0 || !result[0].image_path) {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.status(200).json({ image_path: result[0].image_path });
    }
  });
});

app.post('/newuserdata', upload.single('image'), async (req, res) => {
  const formData = req.body;
  const file = req.file;
  try {
    // Add the new columns in the SQL query
    const sql = `INSERT INTO userdata_vrv (
        emp_code, username, password, confirmpassword, 
        name, dateofjoining, designation, department, 
        data, dob, total_leaves, taking_leaves, balance_leave
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

    // Add values for the new columns, setting them to 0 by default
    const values = [
      formData.emp_code,
      formData.username,
      formData.password,
      formData.confirmPassword,
      formData.name,
      formData.dateofjoining,
      formData.designation,
      formData.department,
      file.buffer,
      formData.dob,
      0, // total_leaves default value
      0, // taking_leaves default value
      0  // balance_leave default value
    ];

    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    res.status(200).json({ message: 'Employee details saved successfully' });
  } catch (error) {
    console.error('Error saving employee details:', error);
    res.status(500).json({ error: 'Error saving employee details' });
  }
});


app.put('/userProfiles/:emp_code', async (req, res) => {
  try {
    const { emp_code } = req.params;
    const { name, dateofjoining, designation, department,dob } = req.body;

    const sqlUpdateuserdata_vrv = 'UPDATE userdata_vrv SET name = $1, dateofjoining = $2,dob = $3 ,designation = $4, department = $5 WHERE emp_code = $6';
    const sqlUpdateLeavedata = 'UPDATE leave_application_vrv SET name = $1 WHERE emp_code = $2';

    await new Promise((resolve, reject) => {
      connection.query(sqlUpdateuserdata_vrv, [name, dateofjoining, dob,designation, department, emp_code], (err, result) => {
        if (err) {
          console.error('Error updating userdata_vrv:', err);
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    await new Promise((resolve, reject) => {
      connection.query(sqlUpdateLeavedata, [name, emp_code], (err, result) => {
        if (err) {
          console.error('Error updating leave_data:', err);
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    res.json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
});


app.delete('/userProfiles/:emp_code', async (req, res) => {
  try {
    const { emp_code } = req.params;
      const userId =req.params.emp_code; 
    const sql = 'delete from userdata_vrv where emp_code=$1';
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, [userId], (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
    res.json({ message: 'User profile deleted successfully' });
  } catch (err) {
    console.error('Error deleting user profile:', err);
    res.status(500).json({ error: 'Error deleting user profile' });
  }
});

app.post('/leave-applications', async (req, res) => {
    try {
      const { name, empCode, leaveType, startDate, endDate, daysOfLeave, reason, status, email, total_leave, depart,leaveDuration } = req.body;
      console.log(req.body)  
      const utcTime = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(utcTime.getTime() + istOffset);
      const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
      const currentDate = new Date().toISOString().slice(0, 10);
      const insertQuery = `INSERT INTO leave_application_vrv (name, leavetype, emp_code, applied_leave_dates, startdate, enddate, daysofleave, reason, status,email,total_leaves,leave_duration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11,$12)`;
      await connection.query(insertQuery, [name, leaveType, empCode, currentDate, startDate, endDate, daysOfLeave, reason, status,email,total_leave,leaveDuration]);
      
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service
        auth: {
          user: 'blitzlearningtechnologies@gmail.com',
          pass: 'bjpr ujij jalg bxta',
        },
      });
  
      let ccEmail;
      if (depart === 'Sales') {
        ccEmail = ['nityanand.yadav@blitzlearning.in'];

        // ccEmail = ['neti@blitzlearning.in','roshni.sarin@blitzlearning.in','abhishek@blitzlearning.in'];
      } else {
        ccEmail = ['nityanand.yadav@blitzlearning.in'];

        // ccEmail = ['neti@blitzlearning.in','roshni.sarin@blitzlearning.in','rajeev@blitzlearning.in'];
      }
      const mailOptions = {
        from: 'blitzlearningtechnologies@gmail.com',
        to: email, // Recipient email address
        cc: ccEmail.join(', '), // Join array into comma-separated string
        subject: 'Leave Application',
        text: `A new leave application:\n\n
               Name: ${name}\n
               Employee Code: ${empCode}\n
               Leave Type: ${leaveType}\n
               Start Date: ${startDate}\n
               End Date: ${endDate}\n
               Days of Leave: ${daysOfLeave}\n
               Reason: ${reason}\n
               Status: ${status}\n
               Applied On: ${currentDate}\n
               `,
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          res.status(500).send('Error creating leave application, but failed to send email');
        } else {
          console.log('Email sent: ' + info.response);
          res.status(200).send('Leave application created successfully and email sent');
        }
      });
    } catch (err) {
      console.error('Error creating leave application:', err);
      res.status(500).send('Error creating leave application');
    }
  });
  

app.get('/leaveapplications', async (req, res) => {
  try {
    const sql = `SELECT 
        leave_application_vrv.id, 
        leave_application_vrv.name, 
        leave_application_vrv.leavetype, 
        leave_application_vrv.startdate, 
        leave_application_vrv.enddate, 
        leave_application_vrv.daysofleave, 
        leave_application_vrv.reason, 
        leave_application_vrv.status, 
        leave_application_vrv.applied_leave_dates, 
        leave_application_vrv.emp_code, 
        leave_application_vrv.total_leaves, 
        leave_application_vrv.email, 
        userdata_vrv.data
    FROM 
        leave_application_vrv
    INNER JOIN 
        userdata_vrv 
    ON 
        leave_application_vrv.emp_code = userdata_vrv.emp_code`;

    const result = await new Promise((resolve, reject) => {
      connection.query(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.rows);
      });
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

function formatDateWithOffset(dateString) {
  const date = new Date(dateString);
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return date.toISOString().split('T')[0];
}

function formatDateToDDMMYYYY(dateString) {
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function incrementDate(dateString) {
  const [dd, mm, yyyy] = dateString.split('/');
  const date = new Date(`${yyyy}-${mm}-${dd}`);
  date.setDate(date.getDate());   // +1
  const newDd = String(date.getDate()).padStart(2, '0');
  const newMm = String(date.getMonth() + 1).padStart(2, '0');
  const newYyyy = date.getFullYear();
  return `${newDd}/${newMm}/${newYyyy}`;
}

async function handleLeaveApplicationUpdate(req, res, status) {
  try {
    const { emp_code } = req.params;
    const { date, email, daysofleave } = req.body;
console.log("kkkk",req.body)
    // Query to get the current status and other details
    const userQuery1 = `SELECT 
      ed.name, 
      ed.email, 
      ed.leavetype, 
      ed.startdate, 
      ed.enddate, 
      ed.applied_leave_dates, 
      ed.status as current_status,
      ld.department,
      ld.taking_leaves,
      ld.total_leaves,
      ld.balance_leave
    FROM 
      leave_application_vrv ed
    JOIN 
      userdata_vrv ld
    ON 
      ed.emp_code = ld.emp_code AND ed.name = ld.name
    WHERE 
      ed.emp_code = $1 and ed.applied_leave_dates = $2;`;
    
    const user = await new Promise((resolve, reject) => {
      connection.query(userQuery1, [emp_code, date], (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return reject(err);
        }
        if (result.rows.length === 0) {
          return reject(new Error("User not found"));
        }
        resolve(result.rows[0]);
      });
    });

    const startdate = formatDate(user.startdate);
    const enddate = formatDate(user.enddate);
    const applyformattedDate = formatDateWithOffset(user.applied_leave_dates);

    const updateStartDate = formatDateToDDMMYYYY(startdate);
    const updateEndtDate = formatDateToDDMMYYYY(enddate);
    const updateApplytDate = formatDateToDDMMYYYY(applyformattedDate);
    const incrementedDate = incrementDate(updateApplytDate);
    const incrementedStartDate = incrementDate(updateStartDate);
    const incrementedEndtDate = incrementDate(updateEndtDate);

    let ccEmail = [];
    if (user.department === "Sales") {
      ccEmail = ['nityanand.yadav@blitzlearning.in'];

      // ccEmail = ["neti@blitzlearning.in", 'roshni.sarin@blitzlearning.in', 'abhishek@blitzlearning.in'];
    } else {
      ccEmail = ['nityanand.yadav@blitzlearning.in'];

      // ccEmail = ["neti@blitzlearning.in", 'roshni.sarin@blitzlearning.in', 'rajeev@blitzlearning.in'];
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "blitzlearningtechnologies@gmail.com",
        pass: "bjpr ujij jalg bxta",
      },
    });

    const mailOptions = {
      from: "blitzlearningtechnologies@gmail.com",
      to: user.email,
       cc: ccEmail,
      subject: "Leave Application Status Update",
      text: `Dear ${user.name},\n\nYour leave application for ${user.leavetype} applied on ${incrementedDate} from ${incrementedStartDate} to ${incrementedEndtDate} has been ${status}.\n\nBest regards,\nBlitz Learning Technologies Pvt. Ltd.`,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).send("Failed to send email");
      }
      console.log("Email sent:", info.response);

      const updateLeaveApplicationSql = 'UPDATE leave_application_vrv SET status = $1 WHERE emp_code = $2 and applied_leave_dates = $3';
      await new Promise((resolve, reject) => {
        connection.query(updateLeaveApplicationSql, [status, emp_code, date], (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return reject(err);
          }
          resolve(result);
        });
      });

      if (status === 'Approved') {
        // Update taking_leaves and balance_leave on approval
        const updateuserdata_vrvSql = `UPDATE userdata_vrv 
          SET taking_leaves = taking_leaves + $1, 
              balance_leave = balance_leave - $1 
          WHERE emp_code = $2`;
        await new Promise((resolve, reject) => {
          connection.query(updateuserdata_vrvSql, [daysofleave, emp_code], (err, result) => {
            if (err) {
              console.error("Database update error:", err);
              return reject(err);
            }
            resolve(result);
          });
        });
      }

      if (status === 'Rejected' && user.current_status === 'Approved') {
        // Update taking_leaves and balance_leave on rejection
        const updateuserdata_vrvSql = `UPDATE userdata_vrv 
          SET taking_leaves = taking_leaves - $1, 
              balance_leave = balance_leave + $1 
          WHERE emp_code = $2`;
        await new Promise((resolve, reject) => {
          connection.query(updateuserdata_vrvSql, [daysofleave, emp_code], (err, result) => {
            if (err) {
              console.error("Database update error:", err);
              return reject(err);
            }
            resolve(result);
          });
        });
      }

      console.log("Status updated successfully");
      res.status(200).send("Status updated successfully and email sent");
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Error updating status");
  }
}

app.put('/leaveapplications/approve/:emp_code', (req, res) => {
  handleLeaveApplicationUpdate(req, res, 'Approved');
});

app.put('/leaveapplications/reject/:emp_code', (req, res) => {
  handleLeaveApplicationUpdate(req, res, 'Rejected');
});



// DELETE endpoint to remove leave details by leaveId
app.delete('/leavedetails/delete/:leaveId', async (req, res) => {
  try {
    const leaveId = req.params.leaveId;
    const applied_leave_dates = req.body.applied_leave_dates.split('T')[0];
    // Get leave details before deletion to include in the email
    const leaveDetailsQuery = 'SELECT * FROM leave_application_vrv WHERE name = $1 AND applied_leave_dates = $2';
    const leaveDetailsResult = await connection.query(leaveDetailsQuery, [leaveId, applied_leave_dates]);

    if (leaveDetailsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Leave detail not found' });
    }
    const leaveDetails = leaveDetailsResult.rows[0];
    const deleteQuery = 'DELETE FROM leave_application_vrv WHERE name = $1 AND applied_leave_dates = $2';
    await connection.query(deleteQuery, [leaveId, applied_leave_dates]);
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'blitzlearningtechnologies@gmail.com',
        pass: 'bjpr ujij jalg bxta',
      },
    });

    let mailOptions = {
      from:'blitzlearningtechnologies@gmail.com' ,
      to: leaveDetails.email, // Use the email from the leave details
      subject: 'Leave Application Deleted',
      text: `Dear ${leaveDetails.name},\n\nYour leave application for ${leaveDetails.leavetype} from ${leaveDetails.startdate} to ${leaveDetails.enddate} has been deleted.\n\nRegards,\nBlitz Learning Technologies Pvt. Ltd.`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email' });
      }
      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Leave detail deleted successfully and email sent' });
    });
  } catch (error) {
    console.error('Error deleting leave detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.put('/leavedetails/:id', async (req, res) => {
  const id = req.params.id;
  const updatedLeave = req.body;
  const currentDate = new Date().toISOString().slice(0, 10);

  try {
    // Update leave details in the database
    const query = `
      UPDATE leave_application_vrv
      SET
        leavetype = $1,
        startdate = $2,
        enddate = $3,
        daysofleave = $4,
        reason = $5,
        status = $6,
        applied_leave_dates = $7
      WHERE id = $8
    `;
    
    const values = [
      updatedLeave.leavetype,
      updatedLeave.startdate,
      updatedLeave.enddate,
      updatedLeave.daysofleave,
      updatedLeave.reason,
      updatedLeave.status,
      updatedLeave.applied_leave_dates,
      id
    ];

    const result = await connection.query(query, values);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Leave application not found" });
      return;
    }

    // Configure the email transport using the default SMTP transport and your email service credentials
    let transporter = nodemailer.createTransport({
      service: 'gmail', // e.g., 'Gmail'
      auth: {
        user: 'blitzlearningtechnologies@gmail.com',
        pass: 'bjpr ujij jalg bxta',
      }
    });

    // Email content
    let mailOptions = {
      from: 'blitzlearningtechnologies@gmail.com',
      to: updatedLeave.email, // recipient email
      subject: 'Leave Application Updated',
      text: `Dear ${updatedLeave.name},\n\n
       The leave application with ID ${id} has been updated.
      Status: ${updatedLeave.status}
      Start Date: ${updatedLeave.startdate}
      End Date: ${updatedLeave.enddate}
      Days of Leave: ${updatedLeave.daysofleave}
      Reason: ${updatedLeave.reason}
      Applied Leave Dates: ${updatedLeave.applied_leave_dates}`
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(200).json({ message: 'Leave application updated and email sent' });

  } catch (error) {
    console.error("Error updating leave data:", error);
    res.status(500).json({ error: "Failed to update leave data" });
  }
});





app.get('/api/leave-data', async (req, res) => {
  try {
    const status = "Pending";
    const sql = 'select name, emp_code, status, applied_leave_dates from leave_application_vrv where status = $1';
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, [status], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});

app.get('/api/approved-data', async (req, res) => {
  try {
    const status = "Approved";
    const sql ='select name,emp_code,status,applied_leave_dates from leave_application_vrv where status=$1';
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, [status], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result.rows);
      });
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});


app.get('/api/Rejected-data', async (req, res) => {
  try {
    const status = "Rejected";
    const sql = 'select name,emp_code,status,applied_leave_dates from leave_application_vrv where status=$1';
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, [status], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});
app.get('/api/tracking-leaves1', async (req, res) => {
  try {
    const sql = 'select name,total_leaves,taking_leaves from userdata_vrv where emp_code = $1 ';
    const sql1 = `SELECT 
        leave_application_vrv.id, 
        leave_application_vrv.name, 
        leave_application_vrv.leavetype, 
        leave_application_vrv.startdate, 
        leave_application_vrv.enddate, 
        leave_application_vrv.daysofleave, 
        leave_application_vrv.reason, 
        leave_application_vrv.status, 
        leave_application_vrv.applied_leave_dates, 
        leave_application_vrv.emp_code, 
        userdata_vrv.total_leaves, 
        userdata_vrv.taking_leaves,
        userdata_vrv.balance_leave, 
        userdata_vrv.data
    FROM 
        leave_application_vrv
    INNER JOIN 
        userdata_vrv 
    ON 
        leave_application_vrv.emp_code = userdata_vrv.emp_code
    WHERE 
        leave_application_vrv.status = 'Approved'`;

    const result = await new Promise((resolve, reject) => {
      connection.query(sql1, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});

app.get('/api/tracking-leaves', async (req, res) => {
  try {
    const { employeeCode } = req.query;

    if (!employeeCode) {
      return res.status(400).json({ error: 'Employee code is required' });
    }
    const sql = 'select name,total_leaves,taking_leaves,balance_leave from userdata_vrv where emp_code = $1 ';
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, [employeeCode], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});



app.get('/leavedetails/:employeeCode', async (req, res) => {
  try {
    const empCode = req.params.employeeCode;
    const query1 = `select * from leave_application_vrv where emp_code = $1`;
    const query = `SELECT 
      leave_application_vrv.id, 
      leave_application_vrv.name, 
      leave_application_vrv.leavetype, 
      leave_application_vrv.startdate, 
      leave_application_vrv.enddate, 
      leave_application_vrv.daysofleave, 
      leave_application_vrv.reason, 
      leave_application_vrv.status, 
      leave_application_vrv.applied_leave_dates, 
      leave_application_vrv.emp_code, 
      leave_application_vrv.total_leaves, 
      leave_application_vrv.email, 
      userdata_vrv.data
    FROM 
      leave_application_vrv
    INNER JOIN 
      userdata_vrv 
    ON 
      leave_application_vrv.emp_code = userdata_vrv.emp_code
    WHERE 
      leave_application_vrv.emp_code = $1`; // Filter by employee code
    const results = await new Promise((resolve, reject) => {
      connection.query(query, [empCode], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    res.json(results.rows);
  } catch (err) {
    console.error('Error fetching leave data: ', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/timein', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;

    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);

    const sql = 'INSERT INTO user_time_sheet1_vrv (username, emp_code, time_in, user_current_date) VALUES ($1, $2, $3, $4)';
    const values = [employeeUsername, employeeCode, istTimeString, currentDate];

    await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error inserting data into MySQL: ' + err.message);
          reject(err);
          return;
        }
        console.log('Time in recorded successfully.');
        resolve(result);
      });
    });

    res.status(200).json({ message: 'Time in recorded successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error recording time in.' });
  }
});


app.post('/timeout', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'UPDATE user_time_sheet1_vrv SET time_out = $1 WHERE username = $2 AND emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];

    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    res.status(200).json({ message: 'Time out recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording time out.' });
  }
});
///////////////////////////////////////// Tea Break-One ////////////////////////////////////////
app.post('/teabreakIn', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv  set tea_break_in = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    res.status(200).json({ message: 'Tea break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording tea break.' });
  }
});

app.post('/teabreakOut', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv  set tea_break = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    res.status(200).json({ message: 'Tea break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording tea break.' });
  }
});
///////////////////////////////////////// Tea Break-Two ////////////////////////////////////////
app.post('/teabreakInTwo', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv  set tea_break_two_in = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    res.status(200).json({ message: 'Tea break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording tea break.' });
  }
});

app.post('/teabreakOutTwo', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv  set tea_break_two = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    res.status(200).json({ message: 'Tea break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording tea break.' });
  }
});
///////////////////////////////////////// Tea Break-Three ////////////////////////////////////////
app.post('/teabreakInThree', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv  set tea_break_three_in = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    res.status(200).json({ message: 'Tea break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording tea break.' });
  }
});

app.post('/teabreakOutThree', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv  set tea_break_three = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    res.status(200).json({ message: 'Tea break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording tea break.' });
  }
});


app.post('/smokingbreak', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv set smoking_break = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await connection.query(sql, values);
    res.status(200).json({ message: 'Smoking break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording smoking break.' });
  }
});
app.post('/smokingbreakIn', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.body;
    const utcTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime.getTime() + istOffset);
    const istTimeString = istTime.toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date().toISOString().slice(0, 10);
    const sql = 'update user_time_sheet1_vrv set smoking_break_in = $1  where username = $2 and emp_code = $3 AND user_current_date = $4';
    const values = [istTimeString, employeeUsername, employeeCode,currentDate];
    const result = await connection.query(sql, values);
    res.status(200).json({ message: 'Smoking break recorded successfully.' });
  } catch (error) {
    console.error('Error updating data into MySQL: ' + error.message);
    res.status(500).json({ error: 'Error recording smoking break.' });
  }
});

const calculateTotalMinutes1 = (data) => {
  let totalMinutes = 0;
  let totalSeconds = 0;

  const timeDiffInSeconds = (startTime, endTime) => {
    const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number);
    const [endHours, endMinutes, endSeconds] = endTime.split(':').map(Number);

    const startTotalSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
    const endTotalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;

    return endTotalSeconds - startTotalSeconds;
  };

  const breaks = [
    { start: 'tea_break', end: 'tea_break_in' },
    { start: 'smoking_break', end: 'smoking_break_in' },
    { start: 'tea_break_two', end: 'tea_break_two_in' },
    { start: 'tea_break_three', end: 'tea_break_three_in' }
  ];

  breaks.forEach(breakTime => {
    const { start, end } = breakTime;
    if (data[start] && data[end]) {
      const diffInSeconds = timeDiffInSeconds(data[start], data[end]);
      totalMinutes += Math.floor(diffInSeconds / 60);
      totalSeconds += diffInSeconds % 60;
    }
  });

  totalMinutes += Math.floor(totalSeconds / 60);
  totalSeconds = totalSeconds % 60;

  return { totalMinutes, totalSeconds };
};

const calculateRemainingMinutes1 = (fixedMinutes, totalMinutes) => {
  const remainingMinutes = fixedMinutes - totalMinutes;
  return remainingMinutes >= 0 ? remainingMinutes : 0;
};

app.get('/timeinDetails', async (req, res) => {
  try {
    const sql = `
      SELECT 
        et.username, 
        et.emp_code, 
        et.time_out, 
        et.tea_break,
        et.tea_break_in, 
        et.tea_break_two,
        et.tea_break_two_in,
        et.tea_break_three,
        et.tea_break_three_in,
        et.smoking_break, 
        et.smoking_break_in, 
        et.time_in, 
        et.user_current_date,
        ed.name
      FROM 
        user_time_sheet1_vrv et
      JOIN 
        userdata_vrv ed
      ON 
        et.emp_code = ed.emp_code; 
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching user profiles:', err);
        res.status(500).json({ error: 'An error occurred while fetching user profiles' });
      } else {
        const fixedMinutes = 60; // Example fixed minutes, adjust as needed
        const processedData = result.rows.map(row => {
          // Add one day to user_current_date
          const currentDate = new Date(row.user_current_date);
          currentDate.setDate(currentDate.getDate());                    //      +1 
          row.user_current_date = currentDate.toISOString().split('T')[0];

          const { totalMinutes } = calculateTotalMinutes1(row);
          const remainingMinutes = calculateRemainingMinutes1(fixedMinutes, totalMinutes);
          return {
            ...row,
            totalMinutes,
            remainingMinutes
          };
        });
        res.json(processedData);
      }
    });
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'An error occurred while fetching user profiles' });
  }
});







app.get('/timesheet', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;
    const todayDate = new Date().toISOString().slice(0, 10);
    const query = `
      SELECT time_in, time_out, tea_break,tea_break_in, tea_break_two, tea_break_two_in, tea_break_three, tea_break_three_in, smoking_break,smoking_break_in, user_current_date
      FROM user_time_sheet1_vrv 
      WHERE emp_code = $1 
      AND username = $2 
      AND user_current_date = $3`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, [employeeCode, employeeUsername, todayDate], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    res.json(results.rows);
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/timesheet22', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;

    // let employeeCode = '2437';
    // let employeeUsername = 'srikant1010'
    const todayDate = new Date().toISOString().slice(0, 10);
console.log("1229",todayDate)
    // Query to get time sheet details
    const timeSheetQuery = `
      SELECT time_in, time_out, tea_break, tea_break_in, tea_break_two, tea_break_two_in, tea_break_three, tea_break_three_in, smoking_break, smoking_break_in, user_current_date
      FROM user_time_sheet1_vrv 
      WHERE emp_code = $1 
      AND username = $2 
      AND user_current_date = $3
    `;

    // Query to get leave details
    const leaveQuery = `
      SELECT leavetype, startdate, enddate, daysofleave, reason, status, applied_leave_dates, leave_duration
      FROM leave_application_vrv 
      WHERE emp_code = $1 
      AND startdate = $2
    `;

    // Execute both queries in parallel
    const [timeSheetResults, leaveResults] = await Promise.all([
      new Promise((resolve, reject) => {
        connection.query(timeSheetQuery, [employeeCode, employeeUsername, todayDate], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        connection.query(leaveQuery, [employeeCode, todayDate], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      })
    ]);

    // Combine the results
    const response = {
      timeSheet: timeSheetResults.rows,
      leaves: leaveResults.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/vacation-leave', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;
    // Write your SQL query to retrieve vacation leave data
    const sqlQuery= `SELECT leavetype, COUNT(*) AS leaveCount FROM leave_application_vrv WHERE emp_code = $1 and leavetype ='Vacation Leave' and status ='Approved' GROUP BY leavetype`;

    const results = await new Promise((resolve, reject) => {
      connection.query(sqlQuery, [employeeCode], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  if (results.rows.length === 0) {
    res.json([{ leavetype: 'Vacation Leave', leaveCount: 0 }]);
  } else {
    res.json(results.rows);
  }

  } catch (error) {
    console.error('Error fetching vacation leave data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/sick-leave', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;
    // Write your SQL query to retrieve sick leave data
    const sqlQuery= `SELECT leavetype, COUNT(*) AS leaveCount FROM leave_application_vrv WHERE emp_code = $1 and leavetype ='Sick Leave' and status ='Approved' GROUP BY leavetype`;

    const results = await new Promise((resolve, reject) => {
      connection.query(sqlQuery, [employeeCode], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
  //   res.json(results.rows);

    // Check if results array is empty, if so, return zero value
    if (results.rows.length === 0) {
      res.json([{ leavetype: 'Sick Leave', leaveCount: 0 }]);
    } else {
      res.json(results.rows);
    }
  } catch (error) {
    console.error('Error fetching sick leave data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/materinity-leave', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;
    // Write your SQL query to retrieve sick leave data
    const sqlQuery= `SELECT leavetype, COUNT(*) AS leaveCount FROM leave_application_vrv WHERE emp_code = $1 and leavetype ='Materinity Leave' and status ='Approved' GROUP BY leavetype`;

    const results = await new Promise((resolve, reject) => {
      connection.query(sqlQuery, [employeeCode], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  if (results.rows.length === 0) {
    res.json([{ leavetype: 'Maternity Leave', leaveCount: 0 }]);
  } else {
    res.json(results.rows);
  }

  } catch (error) {
    console.error('Error fetching materinity leave data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const calculateTotalMinutes = (data) => {
  let totalMinutes = 0;
  let totalSeconds = 0;

  // Function to calculate difference in seconds between two time strings
  const timeDiffInSeconds = (startTime, endTime) => {
      const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number);
      const [endHours, endMinutes, endSeconds] = endTime.split(':').map(Number);

      const startTotalSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
      const endTotalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;

      return endTotalSeconds - startTotalSeconds;
  };

  // Calculate differences for each break
  const breaks = [
      { start: 'tea_break', end: 'tea_break_in' },
      { start: 'smoking_break', end: 'smoking_break_in' },
      { start: 'tea_break_two', end: 'tea_break_two_in' },
      { start: 'tea_break_three', end: 'tea_break_three_in' }
  ];

  breaks.forEach(breakTime => {
      const { start, end } = breakTime;
      if (data[start] && data[end]) {
          const diffInSeconds = timeDiffInSeconds(data[start], data[end]);
          totalMinutes += Math.floor(diffInSeconds / 60);
          totalSeconds += diffInSeconds % 60;
      }
  });

  // Convert total seconds to minutes
  totalMinutes += Math.floor(totalSeconds / 60);
  totalSeconds = totalSeconds % 60;

  return { totalMinutes, totalSeconds };
};

const calculateRemainingMinutes = (fixedMinutes, totalMinutes) => {
  const remainingMinutes = fixedMinutes - totalMinutes;
  return remainingMinutes >= 0 ? remainingMinutes : 0; // Ensure non-negative result
};

app.get('/userTimeCount', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;
const currentDate = new Date().toISOString().slice(0, 10);
      // const empCode = '2435'; // You can replace this with req.params.employeeCode if needed
      const query = `SELECT * FROM user_time_sheet1_vrv WHERE emp_code = $1 and user_current_date=$2`;

      // Fetch data from the database
      const results = await new Promise((resolve, reject) => {
          connection.query(query, [employeeCode,currentDate], (err, results) => {
              if (err) {
                  reject(err);
              } else {
                  resolve(results.rows);
              }
          });
      });

      // Fixed limit in minutes
      const fixedMinutes = 60;

      // Calculate total minutes, seconds, and remaining minutes for each row
      const dataWithTotalMinutes = results.map(row => {
          const { totalMinutes, totalSeconds } = calculateTotalMinutes(row);
          const remainingMinutes = calculateRemainingMinutes(fixedMinutes, totalMinutes);
          return { ...row, total_minutes: totalMinutes, total_seconds: totalSeconds, remaining_minutes: remainingMinutes };
      });

      res.json(dataWithTotalMinutes);
  } catch (err) {
      console.error('Error fetching user time data: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Updated endpoint to calculate balanced leave
app.get('/employee/:id', (req, res) => {
  const employeeId = req.params.id;
  const query = 'SELECT * FROM employeeleaves WHERE id = $1';

  connection.query(query, [employeeId], (err, result) => {
      if (err) throw err;
      if (result.rows.length > 0) {
          const employee = result.rows[0];
          const monthlyLeaves = 1.5;
          const monthsCount = 12; // January to December

          const totalEntitledLeave = monthlyLeaves * monthsCount;
          const totalLeaveTaken = employee.january + employee.february + employee.march + employee.april + employee.may + employee.june + employee.july + employee.august + employee.september + employee.october + employee.november + employee.december;
          const remainingLeave = totalEntitledLeave - totalLeaveTaken;
          const extraLeave = totalLeaveTaken > totalEntitledLeave ? totalLeaveTaken - totalEntitledLeave : 0;
          const balancedLeave = remainingLeave - extraLeave;

          const response = {
              id: employee.id,
              employee_name: employee.employee_name,
              emp_code: employee.emp_code,
              january: employee.january,
              february: employee.february,
              march: employee.march,
              april: employee.april,
              may: employee.may,
              june: employee.june,
              july: employee.july,
              august: employee.august,
              september: employee.september,
              october: employee.october,
              november: employee.november,
              december: employee.december,
              total_leave: totalLeaveTaken,
              remaining_leave: remainingLeave,
              extra_leave: extraLeave,
              balanced_leave: balancedLeave
          };

          res.json(response);
      } else {
          res.status(404).json({ message: 'Employee not found' });
      }
  });
});

app.post('/forgetpassword', async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = 'SELECT username FROM adminlms_vrv WHERE username = $1';
    const results = await connection.query(query, [email]);

    if (results.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updateQuery = 'UPDATE adminlms_vrv SET password = $1 WHERE username = $2';
    await connection.query(updateQuery, [password, email]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/usertimeinDetails/:employeeCode', async (req, res) => {
  const empCode = req.params.employeeCode;
  try {
    const sql = `
      SELECT 
        et.username, 
        et.emp_code, 
        et.time_out, 
        et.tea_break,
        et.tea_break_in, 
        et.tea_break_two,
        et.tea_break_two_in,
        et.tea_break_three,
        et.tea_break_three_in,
        et.smoking_break, 
        et.smoking_break_in, 
        et.time_in, 
        et.user_current_date,
        ed.name
      FROM 
        user_time_sheet1_vrv et
      JOIN 
        userdata_vrv ed
      ON 
        et.emp_code = ed.emp_code
      WHERE
        et.emp_code = $1;
    `;
    connection.query(sql, [empCode], (err, result) => {
      if (err) {
        console.error('Error fetching user profiles:', err);
        res.status(500).json({ error: 'An error occurred while fetching user profiles' });
      } else {
        const fixedMinutes = 60; // Example fixed minutes, adjust as needed
        const processedData = result.rows.map(row => {
          // Add one day to user_current_date
          const currentDate = new Date(row.user_current_date);
          currentDate.setDate(currentDate.getDate()+1);                    //      +1 
          row.user_current_date = currentDate.toISOString().split('T')[0];

          const { totalMinutes } = calculateTotalMinutes1(row);
          const remainingMinutes = calculateRemainingMinutes1(fixedMinutes, totalMinutes);
          return {
            ...row,
            totalMinutes,
            remainingMinutes
          };
        });
        res.json(processedData);
      }
    });
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'An error occurred while fetching user profiles' });
  }
});

app.get('/getAverageTimeIn', async (req, res) => {
  try {
    const { employeeCode, employeeUsername } = req.query;
    const todayDate = new Date().toISOString().slice(0, 10);
    // const todayDate = '2024-07-19'
console.log("getAverageTimeIn",todayDate)
    const query = `
      SELECT TO_CHAR(TO_TIMESTAMP(AVG(EXTRACT(EPOCH FROM time_in))), 'HH12:MI AM') AS avg_time_in
      FROM user_time_sheet1_vrv
      WHERE user_current_date = $1
      GROUP BY user_current_date`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, [todayDate], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Assuming results.rows[0].avg_time_in is in the format 'HH:MI AM/PM'
    const formattedTime = results.rows[0].avg_time_in;

    res.json({ average_time_in: formattedTime });
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getAverageWorkTime', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().slice(0, 10);
    console.log("getAverageWorkTime",yesterdayDate)
    const query = `
      SELECT AVG(EXTRACT(EPOCH FROM (time_out - time_in))) AS avg_work_time_seconds
      FROM user_time_sheet1_vrv
      WHERE user_current_date = $1`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, [yesterdayDate], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (results.rows.length === 0 || !results.rows[0].avg_work_time_seconds) {
      // Handle case where no data is found or average work time is null/undefined
      res.json({ error: 'No data found for the specified date' });
      return;
    }

    // Convert average work time from seconds to "5h 45m" format
    const avgWorkTimeSeconds = results.rows[0].avg_work_time_seconds;
    const hours = Math.floor(avgWorkTimeSeconds / 3600);
    const minutes = Math.floor((avgWorkTimeSeconds % 3600) / 60);
    const overallAverageWorkTime = `${hours}h ${minutes}m`;

    res.json({ overallAverageWorkTime });
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getAverageTimeOut', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().slice(0, 10);
    console.log("getAverageTimeOut",yesterdayDate)

    const query = `
      SELECT TO_CHAR(TO_TIMESTAMP(AVG(EXTRACT(EPOCH FROM time_out))), 'HH12:MI AM') AS avg_time_out
      FROM user_time_sheet1_vrv
      WHERE user_current_date = $1
      GROUP BY user_current_date`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, [yesterdayDate], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    const formattedTime = results.rows[0].avg_time_out;

    res.json({ average_time_out: formattedTime });
    // res.json(results.rows);
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/employees', async (req, res) => {
  try {
    const sql = `SELECT emp_code, name  FROM userdata_vrv`;

    const result = await new Promise((resolve, reject) => {
      connection.query(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.rows);
      });
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});


// // cron.schedule('*/1 * * * *', async () => {      // for after one mintues
//   // cron.schedule('0 0 1 * *', async  () => {           // for months wise
//   const query = `
//     UPDATE userdata_vrv 
//     SET total_leaves = CASE 
//       WHEN CURRENT_DATE - (dateofjoining::date) >= 90 THEN total_leaves + 1.5
//       ELSE total_leaves 
//     END
//     WHERE id = 30
//   `;

//   try {
//     await connection.query(query);
//     console.log('Leaves updated for eligible employees.');
//   } catch (err) {
//     console.error('Failed to update leaves:', err);
//   }
// });

cron.schedule('0 0 1 * *', async  () => {     // runs every minute
  const checkQuery = `
    SELECT id, total_leaves, (CURRENT_DATE - TO_DATE(dateofjoining, 'DD-MM-YYYY')) AS days_since_joining
    FROM userdata_vrv
  `;

  try {
    const result = await connection.query(checkQuery);
    const updates = result.rows.map(user => {
      if (user.days_since_joining >= 90) {
        return {
          id: user.id,
          total_leaves: user.total_leaves + 1.5
        };
      }
      return null;
    }).filter(update => update !== null);

    if (updates.length > 0) {
      const updateQueries = updates.map(update => `
        UPDATE userdata_vrv
        SET total_leaves = ${update.total_leaves}
        WHERE id = ${update.id}
      `).join(';\n');

      await connection.query(updateQueries);
      console.log(`${updates.length} employees' leaves updated.`);
    } else {
      console.log('No employees are eligible for leave updates.');
    }
  } catch (err) {
    console.error('Failed to update leaves:', err);
  }
});

cron.schedule('0 5 1 * *', async () => {  // runs every months at 5:00 AM
  const checkQuery = `
    SELECT id, balance_leave, total_leaves, (CURRENT_DATE - TO_DATE(dateofjoining, 'DD-MM-YYYY')) AS days_since_joining
    FROM userdata_vrv
  `;

  try {
    const result = await connection.query(checkQuery);
    const updates = result.rows.map(user => {
      let updatedBalanceLeave = user.balance_leave;

      if (user.days_since_joining >= 90) {
        updatedBalanceLeave += 1.5;
      }

      if (updatedBalanceLeave < 0) {
        updatedBalanceLeave = 1.5;
      }

      if (updatedBalanceLeave !== user.balance_leave) {
        return {
          id: user.id,
          balance_leave: updatedBalanceLeave
        };
      }
      return null;
    }).filter(update => update !== null);

    if (updates.length > 0) {
      const updateQueries = updates.map(update => `
        UPDATE userdata_vrv
        SET balance_leave = ${update.balance_leave}
        WHERE id = ${update.id}
      `).join(';\n');

      await connection.query(updateQueries);
      console.log(`${updates.length} employees' balance leave updated.`);
    } else {
      console.log('No employees are eligible for balance leave updates.');
    }
  } catch (err) {
    console.error('Failed to update balance leave:', err);
  }
});



// cron.schedule('*/1 * * * *', async () => {  // runs every minute
//   const checkQuery = `
//     SELECT id, balance_leave, total_leaves, (CURRENT_DATE - TO_DATE(dateofjoining, 'DD-MM-YYYY')) AS days_since_joining
//     FROM testdata
//     WHERE id = '6'
//   `;

//   try {
//     const result = await connection.query(checkQuery);
//     const updates = result.rows.map(user => {
//       let updatedBalanceLeave = user.balance_leave;

//       if (user.days_since_joining >= 90) {
//         updatedBalanceLeave += 1.5;
//       } else {
//         updatedBalanceLeave += 0;
//       }

//       if (updatedBalanceLeave < 0) {
//         updatedBalanceLeave += 1.5;
//       }

//       if (updatedBalanceLeave !== user.balance_leave) {
//         return {
//           id: user.id,
//           balance_leave: updatedBalanceLeave
//         };
//       }
//       return null;
//     }).filter(update => update !== null);

//     if (updates.length > 0) {
//       const updateQueries = updates.map(update => `
//         UPDATE testdata
//         SET balance_leave = ${update.balance_leave}
//         WHERE id = ${update.id}
//       `).join(';\n');

//       await connection.query(updateQueries);
//       console.log(`${updates.length} employees' balance leave updated.`);
//     } else {
//       console.log('No updates needed for the employee.');
//     }
//   } catch (err) {
//     console.error('Failed to update balance leave:', err);
//   }
// });

app.get('/userProfilesLeaves', async (req, res) => {
  try {
    const sql = 'SELECT emp_code, name, username, total_leaves, taking_leaves, balance_leave FROM userdata_vrv;';
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching user profiles:', err);
        res.status(500).json({ error: 'An error occurred while fetching user profiles' });
      } else {
        res.json(result.rows);
      }
    });
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'An error occurred while fetching user profiles' });
  }
});

app.put('/editUserLeavesDetails/:emp_code', async (req, res) => {
  try {
    const { emp_code } = req.params;
    console.log(req.body,emp_code)
    const { name, username, total_leaves, taking_leaves,balance_leave } = req.body;

    const sqlUpdateuserdata_vrv = 'UPDATE userdata_vrv SET name = $1, username = $2,total_leaves = $3 ,taking_leaves = $4, balance_leave = $5 WHERE emp_code = $6';

    await new Promise((resolve, reject) => {
      connection.query(sqlUpdateuserdata_vrv, [name, username, total_leaves,taking_leaves, balance_leave, emp_code], (err, result) => {
        if (err) {
          console.error('Error updating userdata_vrv:', err);
          reject(err);
          return;
        }
        resolve(result);
      });
    });
    res.json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
});
