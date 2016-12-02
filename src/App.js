import React, { Component } from 'react';
import './App.css';
import Immutable from 'immutable';

class Rel {
    static table(table) {
        let keys = table[0];
        let rows = [];

        for (var i = 1; i < table.length; i++) {
            let row = [];

            for (var j = 0; j < keys.length; j++) {
                row.push([keys[j], table[i][j]]);
            }

            rows.push(Immutable.OrderedMap(row));
        }

        return new Rel(Immutable.List(rows));
    }

    constructor(rows) {
        this.rows = rows;
    }

    update_cell(row_index, key, value) {
        return new Rel(this.rows.update(row_index, row => row.set(key, value)));
    }

    select(f) {
        if (typeof f === 'string') {
            return new Rel(this.rows.filter(row => {
                let statement = '';

                for (var k of row.keys()) {
                    statement += `var ${k} = row.get(${JSON.stringify(k)});`;
                }

                statement += f;

                return eval(statement);
            }));
        } else {
            return new Rel(this.rows.filter(f));
        }
    }

    project(...cols) {
        return new Rel(this.rows.map(row =>
            Immutable.OrderedMap(cols.map(col => [col, row.get(col)]))))
    }

    rename(from, to) {
        return new Rel(
            this.rows.map(row => Immutable.OrderedMap(
                row.map((x, k) => [k === from ? to : k, x]).toArray())));
    }

    natural_join(other) {
        let rows = [];
        let keys1 = new Immutable.Set(this.rows.get(0).keySeq());
        let keys2 = new Immutable.Set(other.rows.get(0).keySeq());
        let ckeys = keys1.intersect(keys2);

        for (let row1 of this.rows) {
            for (let row2 of other.rows) {
                if (ckeys.every(key => row1.get(key) === row2.get(key))) {
                    rows.push(row1.mergeWith((a, b)=> a, row2));
                }
            }
        }

        return new Rel(Immutable.List(rows));
    }

    render(onChange) {
        if (this.rows.size === 0) {
            return <p>Empty relation</p>
        } else {
            let keys = this.rows.get(0).keySeq().toArray();
            let change = (i, key) => e => onChange(i, key, e.target.value);

            return <table className="rel">
                <thead>
                    <tr>
                    {keys.map(key => <td key={key}>{key}</td>)}
                    </tr>
                </thead>
                <tbody>
                {this.rows.map((row, i) => <tr key={i}>{keys.map(key =>
                    <td key={key}>
                        <input onChange={change(i, key)} value={row.get(key)}/>
                    </td>
                )}</tr>)}
                </tbody>
            </table>
        }
    }
}

let nobel_winners = Rel.table([
    ['author', 'year'],
    ['Andric', '1961'],
    ['Kawabata', '1968'],
    ['Vargas Llosa', '2010'],
    ]);

let books = Rel.table([
    ['title', 'author', 'year'],
    ['Captain Pantoja and the Special Service', 'Vargas Llosa', '1978'],
    ['Confessions of a Mask', 'Mishima', '1949'],
    ['The Bridge on the Drina', 'Andric', '1945'],
    ]);

let authors = Rel.table([
    ['first', 'last', 'country', 'born'],
    ['Haruki', 'Murakami', 'Japan', '1949'],
    ['Ivo', 'Andric', 'Yugoslavia', '1892'],
    ['Julio',  'Cortazar', 'Argentina', '1914'],
    ]);

class App extends Component {
    constructor() {
        super()
        this.state = {
            rels: Immutable.Map({
                nobel_winners: nobel_winners,
                books: books,
                authors: authors,
            }),
            query: `books.select('year <= 1950')`,
        };
    }

    render() {
        let change = relname => (i, key, value) => {
            this.setState({
                rels: this.state.rels.update(relname, rel => rel.update_cell(i, key, value)),
            });
        };

        let change_query = e => {
            this.setState({
                query: e.target.value
            })
        }

        let result;

        try {
            result = (function() {
                let statement = '';

                for (var k of this.state.rels.keys()) {
                    statement += `var ${k} = this.state.rels.get(${JSON.stringify(k)});`;
                }

                statement += this.state.query;

                return eval(statement).render();
            }).call(this);
        } catch (e) {
            console.error(e);
            result = <p>could not understand query</p>
        }

        return (
            <div>
                {this.state.rels.map((rel, relname) => {
                    return <div key={relname}>
                        <p><strong>{relname}</strong></p>
                        {rel.render(change(relname))}
                    </div>;
                }).toList()}
                <pre>
                nobel_winners.project('author').natural_join(books)
                {`\nbooks.select(row => row.get('year') <= 1950)`}
                </pre>
                <p><textarea cols="80" onChange={change_query} value={this.state.query}/></p>
                {result}
            </div>
        );
    }
}

export default App;
