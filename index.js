const oracledb = require('oracledb');
const parse = require('csv-parse');
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));
const inputFile = argv.file;

// reference: https://stackoverflow.com/a/10073788
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function parseCsv() {
  console.log('read file');
  return new Promise((resolve, reject) => {
    let parsedResults = [];
    fs.readFile(inputFile, function (err, contents) {
      parse(contents, { columns: true }, function (err, output) {
        output.forEach(item => {
          let formattedId = pad(item.StudentID, 9)
          let studentIdAndCourseCode = { studentId: formattedId, courseCode: item.CourseCode }

          parsedResults.push(studentIdAndCourseCode);
        });
        resolve(parsedResults);
      })
    })
  })
}

function selectCourseStudyIdAndTitle(studentIdAndCourseCode) {
  return new Promise((resolve, reject) => {
    // console.log('open connection');
    oracledb.getConnection(
      {
        user: process.env.PAMSDEVUSER,
        password: process.env.PAMSDEVPW,
        connectString: 'oracle.dev.wgu.edu:1521/lane2.wgu.edu'
      },
      function (err, connection) {
        if (err) { console.log('err', err); return; }
        let selectQuery = `select
                                code,
                                cv.id,
                                c.TITLE,
                                c.VERSION AS COS_version,
                                COURSE_STUDY_ID
                              from
                                wguprograms.COURSE_VERSION cv
                              JOIN
                                wgucos.courses c
                              ON c.id = cv.COURSE_STUDY_ID
                              where
                                code='${studentIdAndCourseCode.courseCode}' and
                                review_status=5
                              order by
                                major_version`;

        connection.execute(selectQuery, [], function (err, result) {
          if (err) { console.log('err ', err); return; }
          
          let obj = {}

          for (let i = 0; i < result.metaData.length; i++) {
            obj[result.metaData[i].name] = result.rows[0][i];
          }

          const finalObj = Object.assign(obj, studentIdAndCourseCode);
          resolve(finalObj);

          connection.close(function (err) {
            // console.log('close connection');
            if (err) { console.log(err); }
          });
        })
      }
    );
  })
}

async function doWork() {
  try {
    const result = await parseCsv();
    // console.log(result);
    result.forEach(async item => {
        let queryResult = await selectCourseStudyIdAndTitle(item);
        let insertString = `INSERT INTO wguaap.TBL_COS_VERSION_OVERRIDE (STUDENT_PIDM, STUDENT_LOGIN_NAME, ASSESSMENT_CODE, COURSE_ID, COURSE_TITLE, COURSE_VERSION, CREATION_DATE) VALUES ((SELECT g.gobtpac_pidm FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s
             ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '${queryResult.studentId}'),(SELECT g.GOBTPAC_EXTERNAL_USER FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND
             s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '${queryResult.studentId}'), '${queryResult.courseCode}', ${queryResult.COURSE_STUDY_ID}, '${queryResult.TITLE}', 2, systimestamp);`;
        console.log(insertString);
    })
  } catch(err) {
    console.log('err : ', err);
  }
 
}
doWork();