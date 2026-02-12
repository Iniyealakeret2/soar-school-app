module.exports = ({ meta, config, managers }) =>{
    return ({req, res, next})=>{
        let token = req.headers.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
        if(!token){
            console.log('token required but not found')
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
        let decoded = null
        try {
            decoded = managers.token.verifyShortToken({token});
            if(!decoded){
                console.log('failed to decode-1')
                return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
            };
        } catch(err){
            console.log('failed to decode-2', err)
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
    
        next(decoded);
    }
}