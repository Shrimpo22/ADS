<h1 align="center">
  university-software-architecture-project
</h1>

### Arquitetura e Desenho de Software @ ISCTE 2023/2024

The github-pages deployment of this project emulates a webpage built to improve the quality of ISCTE's scheduling.
It will automatically schedule classrooms to a year long calendar of classes.

Two .csv files are needed to use this application:
- the available classrooms and their respective features
- a year long calendar of ISCTE's classes

Example files are stored at: [csv's](https://github.com/moonzn/university-software-architecture-project/tree/master/csv's). These can be downloaded and modified to get different results.

## Features

These are the features available to users when using this application:

- Automatic assignment of classrooms to a year long schedule
- Downloadable CSV file(s) of the resulting schedule(s)
- Preview of the CSV files
- Selection of CSV columns used
- Six different scheduling algorithms
- Selection of CSV separator, time format and date format
- Quality criteria for each produced schedule, such as: capacity wasted, number of features wasted, etc.
- Configuration through a JSON file, that can be both downloaded and uploaded

## Usage

Acess the webpage through this [link](https://moonzn.github.io/university-software-architecture-project/).

### Input the needed files:

![alt text](https://github.com/moonzn/university-software-architecture-project/blob/master/resources/step1.png)

${\color{red}1}$ \- The caracterization of the rooms\
${\color{green}2}$ \- The classes and their scheduled hours, with no rooms assigned
  
### Adjust settings based on the input files:

![alt text](https://github.com/moonzn/university-software-architecture-project/blob/master/resources/step2.png)

${\color{red}1}$ \- You can upload your JSON configuration file here. All your settings will be saved to a JSON that can be downloaded later\
${\color{green}2}$ \- Adjust the column settings based on the columns names of your input files

### Adjust some final settings and submit:

![alt text](https://github.com/moonzn/university-software-architecture-project/blob/master/resources/step3.png)

${\color{red}1}$ \- Choose which algorithms to use: Aldrich (Greedy), Dexter (Greedy, overcapacity permitted), Ratatouille (weight based) or Linguini (weight based with customizable weights)\
${\color{green}2}$ \- Some final settings based on the content of the input\
${\color{purple}3}$ \- Submit and get results!

### Results and configuration files

After it's done processing you can analyse the results based on the metrics provided and download the CSV files generated.
