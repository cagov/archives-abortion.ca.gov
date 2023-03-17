# pull_i18n_from_excel.py
#
import sys, argparse
import pandas as pd
from pprint import pprint

parser = argparse.ArgumentParser(description='pull_i18n_from_excel')
parser.add_argument('-v', '--verbose', default=False, action='store_true', help='Verbose')
parser.add_argument('input_file', nargs='?', default="./i18n-Everything.xls", help='Input File')
args = parser.parse_args()

dataframe1 = pd.read_excel(args.input_file)

fkeys = ['en','es','ko','tl','vi','zh-hans','zh-hant','location']
f_alias = {'location':'location_string'}
print("// Generated with a script")
print("// ")
print("module.exports = {")

for ri,fields in dataframe1.iterrows():
    if args.verbose:
        print("RI %d" % (ri))
    if ri > 0:
        print("")
    klabel = '"%s"' % (fields['_key']) if ' ' in fields['_key'] else fields['_key']
    print('  %s: {' % (klabel))
    for fkey in fkeys:
        try :
            kalias = f_alias[fkey] if fkey in f_alias else fkey
            fcontent = fields[kalias] if kalias in fields else 'null'
            fcontent = fcontent.replace('\\"','"')
            flabel = '"%s"' % (fkey) if '-' in fkey else fkey
            quote_char = '"' if '"' not in fcontent else "'"
            quoted_content = quote_char+fcontent+quote_char
            print('    %s: %s,' % (flabel,  quoted_content))
        except Exception as e:
            print(e)
            print("!!")
            print("Problem with fields can't find %s" % (fkey),fields)
            raise(e)

    print("  },")
print("};")
