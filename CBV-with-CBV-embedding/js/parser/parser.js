class Parser {
  constructor(lexer) {
    this.lexer = lexer;
  }

  parse() {
    const result = this.term([]);
    // make sure we consumed all the program, otherwise there was a syntax error
    this.lexer.match(Token.EOF);

    return result;
  }

  // term ::= LAMBDA LCID DOT term
  //        | LET LCID DEFINE term IN term 
  //        | IF cond THEN term ELSE term
  //        | REC LPAREN LCID COMMA LCID RPAREN DOT term
  //        | application
  term(ctx) {
    if (this.lexer.skip(Token.LAMBDA)) {
      const id = this.lexer.token(Token.LCID);
      this.lexer.match(Token.DOT);
      const term = this.term([id].concat(ctx));
      return new Abstraction(id, term);
    } 
    
    else if (this.lexer.skip(Token.LET)) {
      const id = this.lexer.token(Token.LCID);
      
      if (this.lexer.skip(Token.DEFINE)) { 
        var N;
        if (this.lexer.skip(Token.CLPAREN)) {
          N = this.term(ctx);
          this.lexer.match(Token.CRPAREN);
          this.lexer.match(Token.IN);
          const M = this.term([id].concat(ctx));
          return new ProvApplication(new Abstraction(id, M), N);
        }  
        else {
          N = this.term(ctx);
          this.lexer.match(Token.IN);
          const M = this.term([id].concat(ctx));
          return new Application(new Abstraction(id, M), N);
        }
      }
    } 
    else if (this.lexer.skip(Token.IF)) {
      const cond = this.atom(ctx);
      this.lexer.match(Token.THEN);
      const t1 = this.atom(ctx);
      this.lexer.match(Token.ELSE);
      const t2 = this.atom(ctx);
      return new IfThenElse(cond, t1, t2);
    }
    else if (this.lexer.skip(Token.REC)) {
      this.lexer.match(Token.LPAREN);
      const id = this.lexer.token(Token.LCID);
      this.lexer.match(Token.COMMA);
      const id2 = this.lexer.token(Token.LCID);
      this.lexer.match(Token.RPAREN);
      this.lexer.match(Token.DOT);
      const term = this.term([id2].concat([id].concat(ctx)));
      return new Recursion(id, id2, term);
    }
    else if (this.lexer.skip(Token.CHANGE)) {
      const id = this.lexer.token(Token.LCID);
      this.lexer.match(Token.TO);
      const term = this.term(ctx);
      return new Change(id, term);
    }
    else {
      return this.application(ctx);
    }
  }

  isBinaryOp(token) {
    return token.type == Token.AND || token.type == Token.OR 
        || token.type == Token.PLUS || token.type == Token.SUB  
        || token.type == Token.MULT || token.type == Token.DIV 
        || token.type == Token.LTE || token.type == Token.SEQ
  }

  parseApplication(ctx, lhs, pred) {
    var nextToken = this.lexer.lookahead();
    while (this.isBinaryOp(nextToken) && nextToken.pred >= pred) {
      var op = nextToken;
      this.lexer._nextToken();
      var rhs = this.atom(ctx);
      nextToken = this.lexer.lookahead();
      while (this.isBinaryOp(nextToken) && nextToken.pred > op.pred) {
        rhs = this.parseApplication(ctx, rhs, nextToken.pred);
        nextToken = this.lexer.lookahead();
      }
      if (op.type == Token.AND) {
        lhs = new BinaryOp(BinOpType.And, "&&", lhs, rhs);
      }
      else if (op.type == Token.OR) {
        lhs = new BinaryOp(BinOpType.Or, "||", lhs, rhs);
      }
      else if (op.type == Token.PLUS) {
        lhs = new BinaryOp(BinOpType.Plus, "+", lhs, rhs);
      }
      else if (op.type == Token.SUB) {
        lhs = new BinaryOp(BinOpType.Sub, "-", lhs, rhs);
      }
      else if (op.type == Token.MULT) {
        lhs = new BinaryOp(BinOpType.Mult, "*", lhs, rhs);
      }
      else if (op.type == Token.DIV) {
        lhs = new BinaryOp(BinOpType.Div, "/", lhs, rhs);
      }
      else if (op.type == Token.LTE) {
        lhs = new BinaryOp(BinOpType.Lte, "<=", lhs, rhs);
      }
      else if (op.type == Token.SEQ) {
        lhs = new Application(new Abstraction('_', rhs), lhs);
      }
    }
    return lhs;
  }


  application(ctx) {
    let lhs = this.atom(ctx);
    if (this.isBinaryOp(this.lexer.lookahead()))
      return this.parseApplication(ctx, lhs, 0);

    while (true) {
      var rhs;

      if (this.lexer.skip(Token.CLPAREN)) {
        rhs = this.term(ctx);
        this.lexer.match(Token.CRPAREN);
        lhs = new ProvApplication(lhs, rhs);
      }
      else {
        rhs = this.atom(ctx);
        
        if (!rhs) {
          return lhs;
        } else {
            lhs = new Application(lhs, rhs);
        }
      }
    }

  }

  // atom ::= LPAREN term RPAREN
  //        | LCID
  //        | INT
  //        | TRUE
  //        | FALSE
  //        | NOT term
  //        | LSPAREN int RSPAREN
  //        | LCPAREN int RCPAREN
  atom(ctx) {
    if (this.lexer.skip(Token.LPAREN)) {
      const term = this.term(ctx);
      this.lexer.match(Token.RPAREN);
      return term;
    } 
    else if (this.lexer.next(Token.LCID)) {
      const id = this.lexer.token(Token.LCID)
      return new Identifier(ctx.indexOf(id), id);
    } 
    else if (this.lexer.next(Token.INT)) {
      const n = this.lexer.token(Token.INT);
      return new Constant(n);
    }
    else if (this.lexer.skip(Token.TRUE)) {
      return new Constant(true);
    } 
    else if (this.lexer.skip(Token.FALSE)) {
      return new Constant(false);
    } 
    else if (this.lexer.skip(Token.NOT)) {
      const term = this.term(ctx);
      return new UnaryOp(UnOpType.Not, "~", term);
    }
    else {
      return undefined;
    }
  }
}