module.exports = ({ meta, config, managers }) =>{
    return ({req, res, results, next})=>{
        if(!results.__token){
            return managers.responseDispatcher.dispatch(res, {
                ok: false, 
                code: 401, 
                errors: 'Unauthorized: Token required'
            });
        }
        if(results.__token.role !== 'school_admin'){
            return managers.responseDispatcher.dispatch(res, {
                ok: false, 
                code: 403, 
                errors: 'Forbidden: School Admin access required'
            });
        }
        next();
    }
}
