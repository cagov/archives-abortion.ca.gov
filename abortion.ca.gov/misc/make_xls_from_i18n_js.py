# create new candidate spreadsheet

import argparse
import sys,os, re

# include a library for producing xls files
import xlsxwriter

# parse arguments, get verbose flag, two filenames, and an optional output filename
# if no output filename is given, use the first filename with a .xls extension

parser = argparse.ArgumentParser(description='Create a candidate spreadsheet from an i18n.js file')
parser.add_argument('-v', '--verbose', action='store_true', help='verbose output')
parser.add_argument('input_js', help='input i18n.js file')
parser.add_argument('output_xlsx', nargs='?', default="untitled.xlsx", help='output spreadsheet file')
args = parser.parse_args()

if args.verbose:
    print('input file: %s' % args.input)
    print('output file: %s' % args.output)


# read the input_js file and create a dictionary of the strings

sample_format = '''
// Generated with a script
// 
module.exports = {
    "Abortion access": {
    en: "Abortion access",
    es: "Acceso al aborto",
    ko: "낙태 접근",
    tl: "Access sa pagpapalaglag",
    vi: "Tiếp cận phá thai",
    "zh-hans": "人工流产服务",
    "zh-hant": "使用人工流產服務",
    location: "Site Header",
    },

    "Abortion is legal and protected in California": {
    en: "Abortion is legal and protected in California",
    es: "El aborto es legal y está protegido en California",
    ko: "낙태는 합법적이며 캘리포니아에서 보호됩니다",
    tl: "Ang pagpapalaglag ay legal at protektado sa California",
    vi: "Phá thai là hợp pháp và được bảo vệ ở California",
    "zh-hans": "在加州，人工流产属于合法行为并受到保护",
    "zh-hant": "人工流產在加州是受到法律保障的合法行為",
    location: "Homepage",
    },
    '''
# etc..

columns_list = [
    {'name': '_key', 'display_name':'KEY (do not change)', 'width': 30, 'bg': '#FFFFFF'},
    {'name': 'en', 'width': 25, 'bg': '#EEFFEE'},
    {'name': 'es', 'width': 25, 'bg': '#FFFFFF'},
    {'name': 'ko', 'width': 25, 'bg': '#EEEEEE'},
    {'name': 'tl', 'width': 25, 'bg': '#FFFFFF'},
    {'name': 'vi', 'width': 25, 'bg': '#EEEEEE'},
    {'name': 'zh-hans', 'width': 25, 'bg': '#FFFFFF'},
    {'name': 'zh-hant', 'width': 25, 'bg': '#EEEEEE'},
    {'name': 'location', 'width': 30, 'bg': '#FFFFFF'},
]


with open(args.input_js, 'r') as js:
    js_dict = {}
    key = None
    value = {}
    # loop thru the lines
    for line in js:
        # remove trailing and whitespace
        line = line.rstrip().lstrip()
        # skip lines beginning with double slashes or that are all white space or empty
        if line.startswith('//') or line.isspace() or line == '':
            continue
        # if the line starts with a quoted string end ends with a curly bracket, it's a key
        if line.startswith('"') and line.endswith(': {'):
            # remove the trailing colon and curly bracket
            key = line[:-3]
            # remove the leading and trailing quotes
            key = key[1:-1]
            # initialize the value
            value = {}
        elif line == "},":
            if key:
                js_dict[key] = value
                key = None
                value = {}
        # if the line starts matches the pattern "?(\w?(-\w?)?)"?:\s*"(.*?)" grab the language and string
        elif key is not None:
            # tl: "Ang California ay kumikilos",
            m = re.match(r'"?(\w+(-\w+)?)"?:\s*"(.*)",?$', line)


            if m:
                lang = m.group(1)
                value[lang] = m.group(3)
            else:
                print('no match: %s' % line)

output_filename = args.output_xlsx
workbook = xlsxwriter.Workbook(output_filename)
worksheet = workbook.add_worksheet()
header_format = workbook.add_format({'bold': True, 'bg_color': '#EDEDED', 'font_color': 'black','font_size':14})
gray_cell_format = workbook.add_format({'bg_color': '#EEEEEE','text_wrap': 1})
white_cell_format = workbook.add_format({'bg_color': '#FFFFFF','text_wrap': 1})

for ci,colrec in enumerate(columns_list):
    # set the width of the column
    col_letter = chr(ord('A') + ci)

    # set the background color and width of the column
    worksheet.set_column(ci,ci, colrec['width'])

    # write the column labels
    col_header_cell = col_letter + '1'
    name = colrec['display_name'] if 'display_name' in colrec else colrec['name']
    worksheet.write(col_header_cell, colrec['name'], header_format)

# produce a list of sorted keys of js_dict, primary key is 'location' and secondary key is the key itself
sorted_keys = sorted(js_dict.keys(), key=lambda k: (js_dict[k]['location'], k))

for ki, key in enumerate(sorted_keys):
    # write the key
    worksheet.write(ki+1,0, key, white_cell_format)
    # write the values
    for vi, valrec in enumerate(columns_list[1:]):
        cell_fmt = gray_cell_format if vi % 2 == 0 else white_cell_format
        worksheet.write(ki+1, vi+1, js_dict[key].get(valrec['name'], cell_fmt))

workbook.close()
print(F"output converted table to {output_filename}")