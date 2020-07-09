# CVO Bulk Insert Utility

The purpose of this tool is to generate large INSERT scripts to resolve Course Version Override for a large number of students. It is written in NodeJs and accepts a comma separated file as an argument.


## Dependencies / Prerequisites

 - Node v10.16.3
 - Npm v6.9.0
 - Oracle Database 11g Enterprise Edition Release 11.2.0.4.0 - 64bit Production
 - https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html#ic_osx_inst - need to download 64-bit oracle instant client basic light - directions are at foot of page for installation
 - Access to the PamsDevUser WGU database
	 - Configure **~/.bash_profile** with the values:
		 - PAMSDEVUSER
		 - PAMSDEVPW

## Running Locally

Clone from repository (or request access from tony.busa@wgu.edu): [https://git.wgu.edu/users/tony.busa/repos/scratch/browse](https://git.wgu.edu/users/tony.busa/repos/scratch/browse)
```npm install ```
```node index.js --file test.csv```

## What is happening?

This program takes a test.csv file as a command line argument and parses the values to get out StudentId and CourseCode. It then loops over those values and SELECTs from the PamsDevUser database to obtain the COURSE_STUDY_ID and TITLE. With those values it constructs an INSERT string query for each of the values and prints them to the console.

